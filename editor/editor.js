function editorCanvas(height, palette, preview, codepage, retina) {
    "use strict";
    var canvas, ctx, imageData, image, undoQueue, overlays, mirror;

    canvas = ElementHelper.create("canvas", {"width": retina ? 1280 : 640, "height": retina ? height * 32 : height * 16, "style": {"width": "640px", "height": (height * 16) + "px", "verticalAlign": "bottom"}});
    ctx = canvas.getContext("2d");
    imageData = ctx.createImageData(retina ? 16 : 8, retina ? 32 : 16);
    image = new Uint8Array(80 * height * 3);
    undoQueue = [];
    overlays = {};
    mirror = false;

    function draw(charCode, x, y, fg, bg) {
        imageData.data.set(codepage.bigFont(charCode, fg, bg), 0);
        ctx.putImageData(imageData, x * imageData.width, y * imageData.height);
        preview.draw(charCode, x, y, fg, bg);
    }

    function update(index) {
        draw(image[index], (index / 3) % 80, Math.floor(index / 240), image[index + 1], image[index + 2]);
    }

    function redraw() {
        var i;
        for (i = 0; i < image.length; i += 3) {
            update(i);
        }
    }

    function set(charCode, fg, bg, index) {
        var x, mirrorIndex;
        undoQueue[0].push([image[index], image[index + 1], image[index + 2], index]);
        image[index] = charCode;
        image[index + 1] = fg;
        image[index + 2] = bg;
        update(index);
        if (mirror) {
            x = (index % 240) / 3;
            if (x > 39) {
                mirrorIndex = (x - 40);
                mirrorIndex = index - (mirrorIndex ? mirrorIndex * 2 + 1 : 1) * 3;
            } else {
                mirrorIndex = (39 - x);
                mirrorIndex = index + (mirrorIndex ? mirrorIndex * 2 + 1 : 1) * 3;
            }
            undoQueue[0].push([image[mirrorIndex], image[mirrorIndex + 1], image[mirrorIndex + 2], mirrorIndex]);
            image[mirrorIndex] = charCode;
            image[mirrorIndex + 1] = fg;
            image[mirrorIndex + 2] = bg;
            update(mirrorIndex);
        }
    }

    function setTextBlock(block, charCode, fg, bg) {
        set(charCode, fg, bg, block.index);
    }

    function getBlock(blockX, blockY) {
        var index, textY, modBlockY, charCode, foreground, background, isBlocky, upperBlockColor, lowerBlockColor;
        textY = Math.floor(blockY / 2);
        modBlockY = blockY % 2;
        index = (textY * 80 + blockX) * 3;
        charCode = image[index];
        foreground = image[index + 1];
        background = image[index + 2];
        switch (charCode) {
        case codepage.NULL:
        case codepage.SPACE:
        case codepage.NO_BREAK_SPACE:
            upperBlockColor = background;
            lowerBlockColor = background;
            isBlocky = true;
            break;
        case codepage.UPPER_HALF_BLOCK:
            upperBlockColor = foreground;
            lowerBlockColor = background;
            isBlocky = true;
            break;
        case codepage.LOWER_HALF_BLOCK:
            upperBlockColor = background;
            lowerBlockColor = foreground;
            isBlocky = true;
            break;
        case codepage.FULL_BLOCK:
            upperBlockColor = foreground;
            lowerBlockColor = foreground;
            isBlocky = true;
            break;
        default:
            if (foreground === background) {
                isBlocky = true;
                upperBlockColor = foreground;
                lowerBlockColor = foreground;
            } else {
                isBlocky = false;
            }
        }
        return {
            "index": index,
            "textX": blockX,
            "textY": textY,
            "blockX": blockX,
            "blockY": blockY,
            "isUpperHalf": (modBlockY === 0),
            "isLowerHalf": (modBlockY === 1),
            "charCode": charCode,
            "foreground": foreground,
            "background": background,
            "isBlocky": isBlocky,
            "upperBlockColor": upperBlockColor,
            "lowerBlockColor": lowerBlockColor
        };
    }

    function getTextBlock(textX, textY) {
        return getBlock(textX, textY * 2);
    }

    function setBlock(block, color) {
        if (block.isBlocky) {
            if (block.isUpperHalf) {
                if (block.lowerBlockColor === color) {
                    set(codepage.FULL_BLOCK, color, block.background, block.index);
                } else {
                    set(codepage.UPPER_HALF_BLOCK, color, block.lowerBlockColor, block.index);
                }
            } else {
                if (block.upperBlockColor === color) {
                    set(codepage.FULL_BLOCK, color, block.background, block.index);
                } else {
                    set(codepage.LOWER_HALF_BLOCK, color, block.upperBlockColor, block.index);
                }
            }
        } else {
            if (block.isUpperHalf) {
                set(codepage.UPPER_HALF_BLOCK, color, block.background, block.index);
            } else {
                set(codepage.LOWER_HALF_BLOCK, color, block.background, block.index);
            }
        }
    }

    function blockLine(from, to, callback) {
        var x0, y0, x1, y1, dx, dy, sx, sy, err, e2;

        x0 = from.blockX;
        y0 = from.blockY;
        x1 = to.blockX;
        y1 = to.blockY;
        dx = Math.abs(x1 - x0);
        sx = (x0 < x1) ? 1 : -1;
        dy = Math.abs(y1 - y0);
        sy = (y0 < y1) ? 1 : -1;
        err = ((dx > dy) ? dx : -dy) / 2;

        while (true) {
            callback(getBlock(x0, y0));
            if (x0 === x1 && y0 === y1) {
                break;
            }
            e2 = err;
            if (e2 > -dx) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dy) {
                err += dx;
                y0 += sy;
            }
        }
    }

    function setChar(block, charCode, color) {
        if (block.isBlocky) {
            if (block.isUpperHalf) {
                set(charCode, color, block.upperBlockColor, block.index);
            } else {
                set(charCode, color, block.lowerBlockColor, block.index);
            }
        } else {
            set(charCode, color, block.background, block.index);
        }
    }

    function resolveConflict(block, colorBias, color) {
        block = getBlock(block.blockX, block.blockY);
        if (block.background > 7) {
            if (block.isBlocky) {
                if (block.foreground > 7) {
                    if (colorBias) {
                        if (block.upperBlockColor === color && block.lowerBlockColor === color) {
                            set(codepage.FULL_BLOCK, color, 0, block.index);
                        } else if (block.upperBlockColor === color) {
                            set(codepage.UPPER_HALF_BLOCK, block.upperBlockColor, block.lowerBlockColor - 8, block.index);
                        } else if (block.lowerBlockColor === color) {
                            set(codepage.LOWER_HALF_BLOCK, block.lowerBlockColor, block.upperBlockColor - 8, block.index);
                        } else {
                            set(image[block.index], block.foreground, block.background - 8, block.index);
                        }
                    } else {
                        if (block.upperBlockColor === color && block.lowerBlockColor === color) {
                            set(codepage.FULL_BLOCK, color, 0, block.index);
                        } else if (block.upperBlockColor === color) {
                            set(codepage.LOWER_HALF_BLOCK, block.lowerBlockColor, block.upperBlockColor - 8, block.index);
                        } else if (block.lowerBlockColor === color) {
                            set(codepage.UPPER_HALF_BLOCK, block.upperBlockColor, block.lowerBlockColor - 8, block.index);
                        } else {
                            set(image[block.index], block.foreground, block.background - 8, block.index);
                        }
                    }
                } else {
                    if ((block.upperBlockColor === block.background) && (block.lowerBlockColor === block.background)) {
                        set(codepage.FULL_BLOCK, block.background, block.foreground, block.index);
                    } else if (block.upperBlockColor === block.background) {
                        set(codepage.UPPER_HALF_BLOCK, block.background, block.foreground, block.index);
                    } else if (block.lowerBlockColor === block.background) {
                        set(codepage.LOWER_HALF_BLOCK, block.background, block.foreground, block.index);
                    } else {
                        set(codepage.FULL_BLOCK, block.foreground, block.background - 8, block.index);
                    }
                }
            } else {
                set(image[block.index], block.foreground, block.background - 8, block.index);
            }
        }
    }

    function resolveConflicts(colorBias, color) {
        var i;
        for (i = 0; i < image.length; i += 3) {
            resolveConflict({"blockX": (i / 3) % 80, "blockY": Math.floor(i / 3 / 80) * 2, "index": i}, colorBias, color);
        }
    }

    function startListening() {
        palette.startListening();
    }

    function stopListening() {
        palette.stopListening();
    }

    function clearImage() {
        var i;
        for (i = 0; i < image.length; i += 3) {
            image[i] = 0;
            image[i + 1] = 7;
            image[i + 2] = 0;
        }
        redraw();
    }

    function init(divEditor) {
        palette.init();
        clearImage();

        function dispatchEvent(type, x, y, shiftKey, altKey) {
            var coord, evt, blockX, blockY;
            blockX = Math.floor((x - divEditor.offsetLeft) / 8);
            blockY = Math.floor((y - divEditor.offsetTop) / 8);
            coord = getBlock(blockX, blockY);
            coord.shiftKey = shiftKey;
            coord.altKey = altKey;
            evt = new CustomEvent(type, {"detail": coord});
            canvas.dispatchEvent(evt);
        }

        divEditor.addEventListener("mousedown", function (evt) {
            evt.preventDefault();
            dispatchEvent("canvasDown", evt.pageX, evt.pageY, evt.shiftKey, evt.altKey);
        }, false);

        divEditor.addEventListener("mouseup", function (evt) {
            evt.preventDefault();
            dispatchEvent("canvasUp", evt.pageX, evt.pageY, evt.shiftKey, evt.altKey);
        }, false);

        divEditor.addEventListener("mousemove", function (evt) {
            var mouseButton;
            evt.preventDefault();
            mouseButton = (evt.buttons !== undefined) ? evt.buttons : evt.which;
            if (mouseButton) {
                dispatchEvent("canvasDrag", evt.pageX, evt.pageY, evt.shiftKey, evt.altKey);
            } else {
                dispatchEvent("canvasMove", evt.pageX, evt.pageY);
            }
        }, false);

        startListening();

        canvas.style.position = "absolute";
        canvas.style.left = "0px";
        canvas.style.top = "0px";

        divEditor.appendChild(canvas);
    }

    function undo() {
        var values, i;
        if (undoQueue.length) {
            values = undoQueue.shift();
            for (i = values.length - 1; i >= 0; --i) {
                image[values[i][3]] = values[i][0];
                image[values[i][3] + 1] = values[i][1];
                image[values[i][3] + 2] = values[i][2];
                update(values[i][3]);
            }
            return true;
        }
        return false;
    }

    function takeUndoSnapshot() {
        if (undoQueue.unshift([]) > 1000) {
            undoQueue.pop();
        }
    }

    function clearUndoHistory() {
        while (undoQueue.length) {
            undoQueue.pop();
        }
    }

    function removeOverlay(uid) {
        document.getElementById("editor").removeChild(overlays[uid]);
        delete overlays[uid];
    }

    function addOverlay(overlayCanvas, uid) {
        if (overlays[uid]) {
            removeOverlay(uid);
        }
        overlayCanvas.style.position = "absolute";
        overlayCanvas.style.left = "0px";
        overlayCanvas.style.top = "0px";
        document.getElementById("editor").appendChild(overlayCanvas);
        overlays[uid] = overlayCanvas;
    }

    function turnOnMirroring() {
        mirror = true;
    }

    function turnOffMirroring() {
        mirror = false;
    }

    return {
        "height": height,
        "init": init,
        "canvas": canvas,
        "clearImage": clearImage,
        "redraw": redraw,
        "image": image,
        "getBlock": getBlock,
        "setBlock": setBlock,
        "getTextBlock": getTextBlock,
        "setTextBlock": setTextBlock,
        "blockLine": blockLine,
        "setChar": setChar,
        "resolveConflict": resolveConflict,
        "resolveConflicts": resolveConflicts,
        "takeUndoSnapshot": takeUndoSnapshot,
        "undo": undo,
        "clearUndoHistory": clearUndoHistory,
        "turnOnMirroring": turnOnMirroring,
        "turnOffMirroring": turnOffMirroring,
        "addOverlay": addOverlay,
        "removeOverlay": removeOverlay,
        "stopListening": stopListening,
        "startListening": startListening
    };
}