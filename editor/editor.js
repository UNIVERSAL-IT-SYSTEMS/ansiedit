function editorCanvas(divEditor, columns, rows, noblink) {
    "use strict";
    var codepage, canvas, ctx, imageData, image, currentColor, undoQueue, redoQueue, undoTypes, redoTypes, overlays, mirror, colorListeners, blinkModeChangeListeners, fontChangeListeners, paletteChangeListeners, mouseMoveListeners, mouseDownListeners, mouseDragListeners, mouseUpListeners, mouseOutListeners, overlayChangeListeners, canvasDrawListeners, customEventListeners, title, author, group, UNDO_FREEHAND, UNDO_CHUNK, UNDO_RESIZE;

    codepage = codepageGenerator();
    undoQueue = [];
    undoTypes = [];
    redoQueue = [];
    redoTypes = [];
    overlays = {};
    mirror = false;
    colorListeners = [];
    blinkModeChangeListeners = [];
    fontChangeListeners = [];
    paletteChangeListeners = [];
    mouseMoveListeners = [];
    mouseDownListeners = [];
    mouseDragListeners = [];
    mouseUpListeners = [];
    mouseOutListeners = [];
    overlayChangeListeners = [];
    canvasDrawListeners = [];
    customEventListeners = {};
    title = "";
    author = "";
    group = "";
    UNDO_FREEHAND = 0;
    UNDO_CHUNK = 1;
    UNDO_RESIZE = 2;

    function fireEvent(listeners, evt) {
        listeners.forEach(function (listener) {
            listener(evt);
        });
    }

    function draw(charCode, x, y, fg, bg) {
        imageData.data.set(codepage.fontData(charCode, fg, bg), 0);
        ctx.putImageData(imageData, x * imageData.width, y * imageData.height);
    }

    function update(index) {
        draw(image[index], index / 3 % columns, Math.floor(index / (columns * 3)), image[index + 1], image[index + 2]);
        fireEvent(canvasDrawListeners, [image[index], image[index + 1], image[index + 2], index]);
    }

    function redraw() {
        var i;
        for (i = 0; i < image.length; i += 3) {
            update(i);
        }
    }

    function resetCanvas() {
        var i;
        for (i = 0; i < image.length; i += 3) {
            image[i] = 32;
            image[i + 1] = 7;
            image[i + 2] = 0;
        }
    }

    function clearImage() {
        resetCanvas();
        redraw();
        title = "";
        author = "";
        group = "";
    }

    function getColumns() {
        return columns;
    }

    function getRows() {
        return rows;
    }

    function setMetadata(newTitle, newAuthor, newGroup) {
        title = newTitle;
        author = newAuthor;
        group = newGroup;
    }

    function getMetadata() {
        return {
            "title": title,
            "author": author,
            "group": group
        };
    }

    function addListener(listeners, listener) {
        listeners.push(listener);
    }

    function removeListener(listeners, listener) {
        var i;
        for (i = 0; i < listeners.length; i += 1) {
            if (listeners[i] === listener) {
                listeners.splice(i, 1);
            }
        }
    }

    function addColorChangeListener(listener) {
        addListener(colorListeners, listener);
    }

    function removeColorChangeListener(listener) {
        removeListener(colorListeners, listener);
    }

    function addBlinkModeChangeListener(listener) {
        addListener(blinkModeChangeListeners, listener);
    }

    function removeBlinkModeChangeListener(listener) {
        removeListener(blinkModeChangeListeners, listener);
    }

    function addFontChangeListener(listener) {
        addListener(fontChangeListeners, listener);
    }

    function removeFontChangeListener(listener) {
        removeListener(fontChangeListeners, listener);
    }

    function addPaletteChangeListener(listener) {
        addListener(paletteChangeListeners, listener);
    }

    function removePaletteChangeListener(listener) {
        removeListener(paletteChangeListeners, listener);
    }

    function addMouseMoveListener(listener) {
        addListener(mouseMoveListeners, listener);
    }

    function removeMouseMoveListener(listener) {
        removeListener(mouseMoveListeners, listener);
    }

    function addMouseDownListener(listener) {
        addListener(mouseDownListeners, listener);
    }

    function removeMouseDownListener(listener) {
        removeListener(mouseDownListeners, listener);
    }

    function addMouseDragListener(listener) {
        addListener(mouseDragListeners, listener);
    }

    function removeMouseDragListener(listener) {
        removeListener(mouseDragListeners, listener);
    }

    function addMouseUpListener(listener) {
        addListener(mouseUpListeners, listener);
    }

    function removeMouseUpListener(listener) {
        removeListener(mouseUpListeners, listener);
    }

    function addMouseOutListener(listener) {
        addListener(mouseOutListeners, listener);
    }

    function removeMouseOutListener(listener) {
        removeListener(mouseOutListeners, listener);
    }

    function addOverlayChangeListener(listener) {
        addListener(overlayChangeListeners, listener);
    }

    function removeOverlayChangeListener(listener) {
        removeListener(overlayChangeListeners, listener);
    }

    function addCanvasDrawListener(listener) {
        addListener(canvasDrawListeners, listener);
    }

    function removeCanvasDrawListener(listener) {
        removeListener(canvasDrawListeners, listener);
    }

    function addCustomEventListener(uid, listener) {
        if (customEventListeners[uid] === undefined) {
            customEventListeners[uid] = [];
        }
        addListener(customEventListeners[uid], listener);
    }

    function removeCustomEventListener(uid, listener) {
        if (customEventListeners[uid] !== undefined) {
            removeListener(customEventListeners[uid], listener);
        }
    }

    function fireCustomEvent(uid, evt) {
        if (customEventListeners[uid] !== undefined) {
            fireEvent(customEventListeners[uid], evt);
        }
    }

    function setCurrentColor(color) {
        currentColor = color;
        fireEvent(colorListeners, color);
    }

    function getCurrentColor() {
        return currentColor;
    }

    function storeUndo(block) {
        undoQueue[0].push([block.charCode, block.foreground, block.background, block.index]);
    }

    function set(charCode, fg, bg, index) {
        image[index] = charCode;
        image[index + 1] = fg;
        image[index + 2] = bg;
    }

    function getBlock(blockX, blockY) {
        var index, textY, modBlockY, charCode, foreground, background, isBlocky, upperBlockColor, lowerBlockColor;
        textY = Math.floor(blockY / 2);
        modBlockY = blockY % 2;
        index = (textY * columns + blockX) * 3;
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

    function rehashCanvas() {
        canvas = ElementHelper.create("canvas", {"width": codepage.getFontWidth() * columns, "height": codepage.getFontHeight() * rows, "style": {"verticalAlign": "bottom"}});
        ctx = canvas.getContext("2d");
        imageData = ctx.createImageData(codepage.getFontWidth(), codepage.getFontHeight());
        divEditor.appendChild(canvas);
    }

    function createCanvas() {
        rehashCanvas();
        image = new Uint8Array(columns * rows * 3);
        resetCanvas();
    }

    function clearRedoHistory() {
        while (redoQueue.length) {
            redoQueue.pop();
            redoTypes.pop();
        }
    }

    function clearUndoHistory() {
        clearRedoHistory();
        while (undoQueue.length) {
            undoQueue.pop();
            undoTypes.pop();
        }
    }

    function optimizeUndo(undos) {
        var lookup, i;
        lookup = new Uint8Array(columns * rows * 4);
        for (i = 0; i < undos.length; i += 1) {
            if (lookup[undos[i][3]] === 1) {
                undos.splice(i, 1);
                i -= 1;
            } else {
                lookup[undos[i][3]] = 1;
            }
        }
    }

    function mirrorBlock(block) {
        var halfWay = columns / 2;
        if (block.blockX >= halfWay) {
            return getBlock((halfWay - 1) - (block.blockX - halfWay), block.blockY);
        }
        return getBlock(halfWay + (halfWay - 1 - block.blockX), block.blockY);
    }

    function setTextBlock(block, charCode, fg, bg) {
        storeUndo(block);
        set(charCode, fg, bg, block.index);
        update(block.index);
        if (mirror) {
            charCode = codepage.getFlippedTextX(charCode);
            block = mirrorBlock(block);
            storeUndo(block);
            set(charCode, fg, bg, block.index);
            update(block.index);
        }
    }

    function getTextBlock(textX, textY) {
        return getBlock(textX, textY * 2);
    }

    function getImageData(textX, textY, width, height) {
        var data, i, k, byteWidth, screenWidth;
        data = new Uint8Array(width * height * 3);
        byteWidth = width * 3;
        screenWidth = columns * 3;
        for (i = 0, k = (textY * columns + textX) * 3; i < data.length; i += byteWidth, k += screenWidth) {
            data.set(image.subarray(k, k + byteWidth), i);
        }
        return {
            "width": width,
            "height": height,
            "data": data
        };
    }

    function putImageData(inputImageData, textX, textY, alpha) {
        var y, x, i, block;
        for (y = 0, i = 0; y < inputImageData.height; y += 1) {
            if (textY + y >= rows) {
                break;
            }
            if (textY + y >= 0) {
                for (x = 0; x < inputImageData.width; x += 1, i += 3) {
                    if (textX + x >= 0 && textX + x < columns) {
                        block = getTextBlock(textX + x, textY + y);
                        if (!alpha || inputImageData.data[i] !== codepage.SPACE) {
                            setTextBlock(block, inputImageData.data[i], inputImageData.data[i + 1], inputImageData.data[i + 2]);
                            update(block.index);
                        }
                    }
                }
            } else {
                i += inputImageData.width * 3;
            }
        }
    }

    function renderImageData(inputImageData, preserveTransparency) {
        var fontWidth, fontHeight, imageDataCanvas, imageDataCtx, y, x, i;
        fontWidth = codepage.getFontWidth();
        fontHeight = codepage.getFontHeight();
        imageDataCanvas = ElementHelper.create("canvas", {"width": inputImageData.width * fontWidth, "height": inputImageData.height * fontHeight});
        imageDataCtx = imageDataCanvas.getContext("2d");
        for (y = 0, i = 0; y < inputImageData.height; y += 1) {
            for (x = 0; x < inputImageData.width; x += 1, i += 3) {
                if (!preserveTransparency || inputImageData.data[i] !== codepage.SPACE) {
                    imageData.data.set(codepage.fontData(inputImageData.data[i], inputImageData.data[i + 1], inputImageData.data[i + 2]), 0);
                    imageDataCtx.putImageData(imageData, x * fontWidth, y * fontHeight);
                }
            }
        }
        return imageDataCanvas;
    }

    function resolveConflict(blockIndex, colorBias, color) {
        var block;
        block = getBlock(blockIndex / 3 % columns, Math.floor(blockIndex / 3 / columns) * 2);
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

    function optimizeBlockAttributes(block, color) {
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

    function setBlock(block, color, colorBias, colorBiasColor) {
        storeUndo(block);
        optimizeBlockAttributes(block, color);
        if (!noblink) {
            resolveConflict(block.index, colorBias, colorBiasColor);
        }
        update(block.index);
        if (mirror) {
            block = mirrorBlock(block);
            storeUndo(block);
            optimizeBlockAttributes(block, color);
            if (!noblink) {
                resolveConflict(block.index, colorBias, colorBiasColor);
            }
            update(block.index);
        }
    }

    function setBlocks(colorBias, colorBiasColor, callback) {
        var blockIndexes;
        blockIndexes = [];
        callback(function (block, color) {
            storeUndo(block);
            optimizeBlockAttributes(block, color);
            blockIndexes.push(block.index);
            if (mirror) {
                block = mirrorBlock(block);
                storeUndo(block);
                optimizeBlockAttributes(block, color);
                blockIndexes.push(block.index);
            }
        });
        blockIndexes.forEach(function (index) {
            if (!noblink) {
                resolveConflict(index, colorBias, colorBiasColor);
            }
            update(index);
        });
    }

    function setChar(block, charCode, color) {
        storeUndo(block);
        if (block.isBlocky) {
            if (block.isUpperHalf) {
                set(charCode, color, block.upperBlockColor, block.index);
            } else {
                set(charCode, color, block.lowerBlockColor, block.index);
            }
        } else {
            set(charCode, color, block.background, block.index);
        }
        if (!noblink) {
            resolveConflict(block.index, true, color);
        }
        update(block.index);
        if (mirror) {
            charCode = codepage.getFlippedTextX(charCode);
            block = mirrorBlock(block);
            storeUndo(block);
            if (block.isBlocky) {
                if (block.isUpperHalf) {
                    set(charCode, color, block.upperBlockColor, block.index);
                } else {
                    set(charCode, color, block.lowerBlockColor, block.index);
                }
            } else {
                set(charCode, color, block.background, block.index);
            }
            if (!noblink) {
                resolveConflict(block.index, true, color);
            }
            update(block.index);
        }
    }

    function blockLine(from, to, callback, colorBias, colorBiasColor) {
        var x0, y0, x1, y1, dx, dy, sx, sy, err, e2, block, blocks, i;

        function setBlockLineBlock(blockLineBlock, color) {
            storeUndo(blockLineBlock);
            optimizeBlockAttributes(blockLineBlock, color);
            blocks.push(blockLineBlock.index);
            if (mirror) {
                blockLineBlock = mirrorBlock(block);
                storeUndo(blockLineBlock);
                optimizeBlockAttributes(blockLineBlock, color);
                blocks.push(blockLineBlock.index);
            }
        }

        x0 = from.blockX;
        y0 = from.blockY;
        x1 = to.blockX;
        y1 = to.blockY;
        dx = Math.abs(x1 - x0);
        sx = (x0 < x1) ? 1 : -1;
        dy = Math.abs(y1 - y0);
        sy = (y0 < y1) ? 1 : -1;
        err = ((dx > dy) ? dx : -dy) / 2;
        blocks = [];

        while (true) {
            block = getBlock(x0, y0);
            callback(block, setBlockLineBlock);
            if (x0 === x1 && y0 === y1) {
                for (i = 0; i < blocks.length; i += 1) {
                    if (!noblink) {
                        resolveConflict(blocks[i], colorBias, colorBiasColor);
                    }
                    update(blocks[i]);
                }
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

    function init() {
        var mouseButton;
        mouseButton = false;

        function canvasEvent(listeners, x, y, shiftKey, altKey, ctrlKey) {
            var coord, blockX, blockY;
            blockX = Math.floor((x - divEditor.offsetLeft + divEditor.scrollLeft) / codepage.getFontWidth());
            blockY = Math.floor((y - divEditor.offsetTop + divEditor.scrollTop) / (codepage.getFontHeight() / 2));
            if (blockX >= 0 && blockY >= 0 && blockX < columns && blockY < rows * 2) {
                coord = getBlock(blockX, blockY);
                coord.shiftKey = shiftKey;
                coord.altKey = altKey;
                coord.ctrlKey = ctrlKey;
                fireEvent(listeners, coord);
            }
        }

        divEditor.addEventListener("contextmenu", function (evt) {
            evt.preventDefault();
        }, false);

        divEditor.addEventListener("mousedown", function (evt) {
            evt.preventDefault();
            if (!evt.ctrlKey) {
                mouseButton = true;
            }
            canvasEvent(mouseDownListeners, evt.clientX - canvas.offsetLeft, evt.clientY - canvas.offsetTop, evt.shiftKey, evt.altKey, evt.ctrlKey);
        }, false);

        divEditor.addEventListener("mouseup", function (evt) {
            evt.preventDefault();
            if (mouseButton) {
                mouseButton = false;
                canvasEvent(mouseUpListeners, evt.clientX - canvas.offsetLeft, evt.clientY - canvas.offsetTop, evt.shiftKey, evt.altKey, evt.ctrlKey);
            }
        }, false);

        divEditor.addEventListener("mousemove", function (evt) {
            evt.preventDefault();
            if (mouseButton) {
                canvasEvent(mouseDragListeners, evt.clientX - canvas.offsetLeft, evt.clientY - canvas.offsetTop, evt.shiftKey, evt.altKey, evt.ctrlKey);
            } else {
                canvasEvent(mouseMoveListeners, evt.clientX - canvas.offsetLeft, evt.clientY - canvas.offsetTop);
            }
        }, false);

        divEditor.addEventListener("mouseleave", function (evt) {
            evt.preventDefault();
            mouseButton = false;
            fireEvent(mouseOutListeners, undefined);
        }, false);

        createCanvas();
        currentColor = 7;
        redraw();
    }

    function removeOverlay(uid) {
        divEditor.removeChild(overlays[uid].canvas);
        delete overlays[uid];
    }

    function isOverlayVisible(uid) {
        return overlays[uid] !== undefined;
    }

    function addOverlay(overlayCanvas, uid, redraw, zIndex) {

        function realignOverlay() {
            overlayCanvas.style.left = canvas.offsetLeft + "px";
        }

        if (overlays[uid]) {
            removeOverlay(uid);
        }
        overlayCanvas.style.zIndex = zIndex.toString(10);
        overlayCanvas.className = "canvas-overlay";
        realignOverlay();
        window.addEventListener("resize", realignOverlay, false);
        divEditor.appendChild(overlayCanvas);
        overlays[uid] = {"canvas": overlayCanvas, "redraw": redraw};
    }

    function rehashOverlays() {
        fireEvent(overlayChangeListeners, undefined);
        Object.keys(overlays).forEach(function (uid) {
            var overlay, zIndex, canvas;
            overlay = overlays[uid];
            zIndex = parseInt(overlay.canvas.style.zIndex, 10);
            removeOverlay(uid);
            canvas = overlay.redraw();
            addOverlay(canvas, uid, overlay.redraw, zIndex);
        });
    }

    function undo() {
        var values, redoValues, undoType, i, canvasIndex;
        if (undoQueue.length) {
            undoType = undoTypes.shift();
            redoTypes.unshift(undoType);
            values = undoQueue.shift();
            if (undoType === UNDO_RESIZE) {
                redoQueue.unshift([columns, rows, image.subarray(0, image.length)]);
                columns = values[0];
                rows = values[1];
                divEditor.removeChild(canvas);
                createCanvas();
                image.set(values[2], 0);
                rehashOverlays();
                redraw();
            } else {
                redoValues = [];
                values.reverse();
                for (i = 0; i < values.length; i += 1) {
                    canvasIndex = values[i][3];
                    redoValues.push([image[canvasIndex], image[canvasIndex + 1], image[canvasIndex + 2], canvasIndex]);
                    image[canvasIndex] = values[i][0];
                    image[canvasIndex + 1] = values[i][1];
                    if (!noblink && values[i][2] >= 8) {
                        image[canvasIndex + 2] = values[i][2] - 8;
                    } else {
                        image[canvasIndex + 2] = values[i][2];
                    }
                    update(canvasIndex);
                }
                redoQueue.unshift([redoValues.reverse(), values.reverse()]);
                values.reverse();
            }
            return true;
        }
        return false;
    }

    function redo() {
        var values, redoType, i, updatedBlocks, canvasIndex;
        if (redoQueue.length) {
            redoType = redoTypes.shift();
            undoTypes.unshift(redoType);
            values = redoQueue.shift();
            if (redoType === UNDO_RESIZE) {
                undoQueue.unshift([columns, rows, image.subarray(0, image.length)]);
                columns = values[0];
                rows = values[1];
                divEditor.removeChild(canvas);
                createCanvas();
                image.set(values[2], 0);
                rehashOverlays();
                redraw();
            } else {
                updatedBlocks = [];
                for (i = 0; i < values[0].length; i += 1) {
                    canvasIndex = values[0][i][3];
                    image[canvasIndex] = values[0][i][0];
                    image[canvasIndex + 1] = values[0][i][1];
                    if (!noblink && values[0][i][2] >= 8) {
                        image[canvasIndex + 2] = values[0][i][2] - 8;
                    } else {
                        image[canvasIndex + 2] = values[0][i][2];
                    }
                    update(canvasIndex);
                    updatedBlocks.push(values[0][i]);
                }
                undoQueue.unshift(values[1].reverse());
            }
            return true;
        }
        return false;
    }

    function startOfDrawing(typeOfUndo) {
        clearRedoHistory();
        if (undoQueue.length !== 0) {
            if (undoQueue[0].length === 0) {
                undoQueue.splice(0, 1);
                undoTypes.splice(0, 1);
            } else {
                if (undoTypes[0] === UNDO_FREEHAND) {
                    optimizeUndo(undoQueue[0]);
                }
            }
        }
        undoQueue.unshift([]);
        undoTypes.unshift(typeOfUndo);
    }

    function startOfFreehand() {
        startOfDrawing(UNDO_FREEHAND);
    }

    function startOfChunk() {
        startOfDrawing(UNDO_CHUNK);
    }

    function endOfChunk() {
        optimizeUndo(undoQueue[0]);
    }

    function getUndoHistory() {
        return {"queue": undoQueue, "types": undoTypes};
    }

    function setUndoHistory(queue, types) {
        clearUndoHistory();
        undoQueue = queue;
        undoTypes = types;
    }

    function resize(newColumns, newRows) {
        var oldColumns, oldRows, oldImage, x, y, sourceIndex, destIndex;
        clearRedoHistory();
        oldColumns = columns;
        oldRows = rows;
        columns = newColumns;
        rows = newRows;
        oldImage = image;
        divEditor.removeChild(canvas);
        createCanvas();
        undoQueue.unshift([oldColumns, oldRows, oldImage.subarray(0, oldImage.length)]);
        undoTypes.unshift(UNDO_RESIZE);
        for (y = 0, destIndex = 0; y < rows; y += 1) {
            for (x = 0; x < columns; x += 1, destIndex += 3) {
                if (x < oldColumns && y < oldRows) {
                    sourceIndex = (y * oldColumns + x) * 3;
                    image.set(oldImage.subarray(sourceIndex, sourceIndex + 3), destIndex);
                }
            }
        }
        rehashOverlays();
        redraw();
    }

    function getBlinkStatus() {
        return noblink;
    }

    function setBlinkStatus(value) {
        var i;
        if (value !== noblink) {
            noblink = value;
            if (!noblink) {
                for (i = 2; i < image.length; i += 3) {
                    if (image[i] >= 8) {
                        image[i] -= 8;
                        update(i - 2);
                    }
                }
            }
            fireEvent(blinkModeChangeListeners, noblink);
        }
    }

    function notifyOfFontChange() {
        divEditor.removeChild(canvas);
        rehashCanvas();
        fireEvent(fontChangeListeners, undefined);
        rehashOverlays();
        redraw();
    }

    function setFont(width, height, bytes) {
        codepage.setFont(width, height, bytes);
        notifyOfFontChange();
    }

    function setFontToDefault() {
        codepage.setFontToDefault();
        notifyOfFontChange();
    }

    function notifyOfPaletteChange() {
        fireEvent(paletteChangeListeners, undefined);
        redraw();
    }

    function setPalette(colors) {
        codepage.setPalette(colors);
        notifyOfPaletteChange();
    }

    function setPaletteToDefault() {
        codepage.setPaletteToDefault();
        notifyOfPaletteChange();
    }

    function setImage(inputImageData) {
        var i;
        clearUndoHistory();
        setBlinkStatus(inputImageData.noblink);
        columns = inputImageData.width;
        rows = inputImageData.height;
        title = inputImageData.title;
        author = inputImageData.author;
        group = inputImageData.group;
        if (inputImageData.font !== undefined) {
            codepage.setFont(inputImageData.fontWidth, inputImageData.fontHeight, inputImageData.font);
        } else {
            codepage.setFontToDefault();
        }
        if (inputImageData.palette !== undefined) {
            codepage.setPalette(inputImageData.palette);
        } else {
            codepage.setPaletteToDefault();
        }
        divEditor.removeChild(canvas);
        createCanvas();
        for (i = 0; i < image.length; i += 3) {
            image.set(inputImageData.data.subarray(i, i + 3), i);
        }
        rehashOverlays();
        fireEvent(fontChangeListeners, undefined);
        fireEvent(paletteChangeListeners, undefined);
        redraw();
    }

    function setMirror(value) {
        mirror = value;
    }

    function centerOn(xPos, yPos) {
        var size;
        size = divEditor.getBoundingClientRect();
        divEditor.scrollLeft = xPos - size.width / 2;
        divEditor.scrollTop = yPos - size.height / 2;
    }

    return {
        "codepage": codepage,
        "init": init,
        "getColumns": getColumns,
        "getRows": getRows,
        "setMetadata": setMetadata,
        "getMetadata": getMetadata,
        "setCurrentColor": setCurrentColor,
        "getCurrentColor": getCurrentColor,
        "getRGBAColorFor": codepage.styleRGBA,
        "addColorChangeListener": addColorChangeListener,
        "removeColorChangeListener": removeColorChangeListener,
        "addBlinkModeChangeListener": addBlinkModeChangeListener,
        "removeBlinkModeChangeListener": removeBlinkModeChangeListener,
        "addFontChangeListener": addFontChangeListener,
        "removeFontChangeListener": removeFontChangeListener,
        "addPaletteChangeListener": addPaletteChangeListener,
        "removePaletteChangeListener": removePaletteChangeListener,
        "addMouseMoveListener": addMouseMoveListener,
        "removeMouseMoveListener": removeMouseMoveListener,
        "addMouseDownListener": addMouseDownListener,
        "removeMouseDownListener": removeMouseDownListener,
        "addMouseDragListener": addMouseDragListener,
        "removeMouseDragListener": removeMouseDragListener,
        "addMouseUpListener": addMouseUpListener,
        "removeMouseUpListener": removeMouseUpListener,
        "addMouseOutListener": addMouseOutListener,
        "removeMouseOutListener": removeMouseOutListener,
        "addOverlayChangeListener": addOverlayChangeListener,
        "removeOverlayChangeListener": removeOverlayChangeListener,
        "addCanvasDrawListener": addCanvasDrawListener,
        "removeCanvasDrawListener": removeCanvasDrawListener,
        "addCustomEventListener": addCustomEventListener,
        "removeCustomEventListener": removeCustomEventListener,
        "fireCustomEvent": fireCustomEvent,
        "clearImage": clearImage,
        "redraw": redraw,
        "resize": resize,
        "setImage": setImage,
        "getBlinkStatus": getBlinkStatus,
        "setBlinkStatus": setBlinkStatus,
        "setFont": setFont,
        "setFontToDefault": setFontToDefault,
        "setPalette": setPalette,
        "setPaletteToDefault": setPaletteToDefault,
        "getPalette": codepage.getPalette,
        "getBlock": getBlock,
        "setBlock": setBlock,
        "setBlocks": setBlocks,
        "getTextBlock": getTextBlock,
        "setTextBlock": setTextBlock,
        "getImageData": getImageData,
        "putImageData": putImageData,
        "renderImageData": renderImageData,
        "blockLine": blockLine,
        "setChar": setChar,
        "startOfFreehand": startOfFreehand,
        "startOfChunk": startOfChunk,
        "endOfChunk": endOfChunk,
        "undo": undo,
        "redo": redo,
        "getUndoHistory": getUndoHistory,
        "setUndoHistory": setUndoHistory,
        "clearUndoHistory": clearUndoHistory,
        "setMirror": setMirror,
        "addOverlay": addOverlay,
        "removeOverlay": removeOverlay,
        "isOverlayVisible": isOverlayVisible,
        "centerOn": centerOn
    };
}