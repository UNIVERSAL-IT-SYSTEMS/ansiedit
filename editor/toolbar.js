function toolbarWidget(editor) {
    "use strict";
    var quickAccessPanel, quickFontAccessPanel, quickAccessDisplayed, quickFontAccessDisplayed, quickAccessOffset, quickFontAccessOffset, selected, shortcuts, functionShortcuts, tools, proMode, title, mousePos;

    shortcuts = [];
    functionShortcuts = [];
    tools = {};
    proMode = false;
    quickAccessPanel = ElementHelper.create("div", {"className": "quick-access-panel"});
    quickFontAccessPanel = ElementHelper.create("div", {"className": "quick-access-panel fonts"});
    quickAccessDisplayed = false;
    quickFontAccessDisplayed = false;
    quickAccessOffset = {"x": 8, "y": 8};
    quickFontAccessOffset = {"x": 8, "y": 8};
    mousePos = {"x": 0, "y": 0};

    function addTool(tool, elementId, keyCode, functionKeys) {
        var div, divCanvasContainer, paragraph;

        function shortcutName(code, shiftKey) {
            var keyName;
            switch (code) {
            case 44:
                return "comma";
            case 32:
                return "space";
            default:
                keyName = String.fromCharCode(keyCode);
                return shiftKey ? keyName + " / " + keyName.toUpperCase() : keyName;
            }
        }

        function updateStatus() {
            var title;
            title = tool.toString();
            if (keyCode) {
                title += " - " + shortcutName(keyCode, tool.shiftKey || tool.modeShiftKey);
            }
            if (tool.hideText !== true) {
                paragraph.textContent = title;
                if (tool.isEnabled) {
                    if (tool.isEnabled()) {
                        div.className = "tool enabled";
                    } else {
                        div.className = "tool";
                    }
                }
            }
        }

        function select(parameter, shiftKey) {
            var initializer;
            if ((selected && (selected.tool.uid === tool.uid))) {
                if (tool.modeChange) {
                    tool.modeChange(shiftKey);
                    updateStatus();
                    editor.fireCustomEvent("current-tool", tool.toString());
                }
                if (parameter && tool[parameter]) {
                    tool[parameter]();
                }
            } else {
                if (tool.init) {
                    initializer = shiftKey ? (tool.shiftKey || tool.init) : tool.init;
                    if (tool.isModal) {
                        div.className = "tool modal-on";
                    }
                    if (initializer()) {
                        if (selected) {
                            selected.div.className = "tool";
                            selected.tool.remove();
                        }
                        selected = {"div": div, "tool": tool};
                        div.className = "tool selected";
                        editor.fireCustomEvent("current-tool", tool.toString());
                    }
                }
                if (parameter && tool[parameter]) {
                    tool[parameter](shiftKey);
                }
                updateStatus();
            }
        }

        function animationEnd() {
            div.className = "tool";
        }

        div = ElementHelper.create("div", {"className": "tool"});
        if (tool.hideText === true) {
            div.className += " hide-text";
        }
        div.addEventListener("mousedown", function (evt) {
            evt.preventDefault();
            select(undefined, evt.which === 3);
        }, false);
        div.addEventListener("contextmenu", function (evt) {
            evt.preventDefault();
        }, false);
        div.addEventListener("animationend", animationEnd, false);
        div.addEventListener("webkitAnimationEnd", animationEnd, false);

        tools[tool.uid] = {"select": select, "onload": tool.onload, "updateStatus": updateStatus, "sampleBlock": tool.sampleBlock, "div": div, "getState": tool.getState, "setState": tool.setState};
        if (tool.hideText !== true) {
            if (keyCode) {
                shortcuts[keyCode] = {"select": select};
                paragraph = ElementHelper.create("p", {"textContent": tool.toString() + " - " + shortcutName(keyCode, tool.shiftKey || tool.modeShiftKey)});
            } else {
                paragraph = ElementHelper.create("p", {"textContent": tool.toString()});
            }
            div.appendChild(paragraph);
        }
        if (functionKeys) {
            Object.keys(functionKeys).forEach(function (parameter) {
                functionShortcuts[functionKeys[parameter]] = {"select": select, "parameter": parameter};
            });
        }
        if (tool.canvas !== undefined) {
            tool.canvas.style.verticalAlign = "bottom";
            divCanvasContainer = ElementHelper.create("div");
            if (tool.canvas.style.width !== undefined) {
                divCanvasContainer.style.width = tool.canvas.style.width;
            } else {
                divCanvasContainer.style.width = tool.canvas.width + "px";
            }
            if (tool.hideText !== true) {
                divCanvasContainer.style.margin = "4px auto";
            } else {
                divCanvasContainer.style.margin = "0px auto";
            }
            divCanvasContainer.appendChild(tool.canvas);
            div.appendChild(divCanvasContainer);
            tools[tool.uid].divCanvasContainer = divCanvasContainer;
            tools[tool.uid].canvas = tool.canvas;
        }
        if (tool.quickAccess !== undefined) {
            quickAccessPanel.appendChild(tool.quickAccess);
            tools[tool.uid].quickAccess = tool.quickAccess;
        }
        if (tool.quickFontAccess !== undefined) {
            quickFontAccessPanel.appendChild(tool.quickFontAccess);
            tools[tool.uid].quickFontAccess = tool.quickFontAccess;
        }

        document.getElementById(elementId).appendChild(div);

        if (tool.autoselect) {
            select();
        }

        return {
            "select": select
        };
    }

    function getCurrentTool() {
        if (selected !== undefined) {
            return selected.tool.uid;
        }
        return undefined;
    }

    function getStates() {
        var states;
        states = {};
        Object.keys(tools).forEach(function (key) {
            if (tools[key].getState !== undefined) {
                states[key] = tools[key].getState();
            }
        });
        return states;
    }

    function setStates(states) {
        Object.keys(states).forEach(function (uid) {
            if (states[uid].length !== 0 && tools[uid] !== undefined) {
                tools[uid].setState(states[uid]);
                tools[uid].updateStatus();
            }
        });
    }

    function keydown(evt) {
        var keyCode, resizeEvent;
        keyCode = evt.keyCode || evt.which;
        if (keyCode === 27) {
            evt.preventDefault();
            document.getElementById("container").className = proMode ? "" : "pro";
            proMode = !proMode;
            resizeEvent = document.createEvent("Event");
            resizeEvent.initEvent("resize", true, true);
            window.dispatchEvent(resizeEvent);
        } else if ((keyCode >= 112 && keyCode <= 122) || (keyCode >= 49 && keyCode <= 56) || keyCode === 9) {
            evt.preventDefault();
            if (functionShortcuts[keyCode]) {
                functionShortcuts[keyCode].select(functionShortcuts[keyCode].parameter, evt.shiftKey);
            }
        } else if (keyCode === 81 && !quickAccessDisplayed) {
            evt.preventDefault();
            quickAccessPanel.style.left = (mousePos.x - quickAccessOffset.x) + "px";
            quickAccessPanel.style.top = (mousePos.y - quickAccessOffset.y) + "px";
            document.body.appendChild(quickAccessPanel);
            quickAccessDisplayed = true;
        } else if (keyCode === 87 && !quickFontAccessDisplayed) {
            evt.preventDefault();
            quickFontAccessPanel.style.left = (mousePos.x - quickFontAccessOffset.x) + "px";
            quickFontAccessPanel.style.top = (mousePos.y - quickFontAccessOffset.y) + "px";
            document.body.appendChild(quickFontAccessPanel);
            quickFontAccessDisplayed = true;
        }
    }

    function keyup(evt) {
        var keyCode;
        keyCode = evt.keyCode || evt.which;
        if (keyCode === 81 && quickAccessDisplayed) {
            evt.preventDefault();
            document.body.removeChild(quickAccessPanel);
            quickAccessDisplayed = false;
        } else if (keyCode === 87 && quickFontAccessDisplayed) {
            evt.preventDefault();
            document.body.removeChild(quickFontAccessPanel);
            quickFontAccessDisplayed = false;
        }
    }

    function keypress(evt) {
        var keyCode;
        keyCode = evt.keyCode || evt.which;
        if (keyCode >= 65 && keyCode <= 90) {
            keyCode += 32;
        }
        if (shortcuts[keyCode] && !evt.metaKey) {
            evt.preventDefault();
            shortcuts[keyCode].select(undefined, evt.shiftKey);
        }
    }

    document.addEventListener("mousemove", function (evt) {
        mousePos = {"x": evt.clientX, "y": evt.clientY};
    }, false);

    function updateQuickPanelOffset(evt) {
        var pos;
        pos = evt.currentTarget.getBoundingClientRect();
        quickAccessOffset = {"x": evt.clientX - pos.left, "y": evt.clientY - pos.top};
    }

    function updateQuickFontPanelOffset(evt) {
        var pos;
        pos = evt.currentTarget.getBoundingClientRect();
        quickFontAccessOffset = {"x": evt.clientX - pos.left, "y": evt.clientY - pos.top};
    }

    quickAccessPanel.addEventListener("mousedown", updateQuickPanelOffset, false);
    quickFontAccessPanel.addEventListener("mousedown", updateQuickFontPanelOffset, false);

    quickAccessPanel.addEventListener("mousemove", function (evt) {
        var mouseButton;
        mouseButton = (evt.buttons !== undefined) ? evt.buttons : evt.which;
        if (mouseButton) {
            updateQuickPanelOffset(evt);
        }
    }, false);

    quickFontAccessPanel.addEventListener("mousemove", function (evt) {
        var mouseButton;
        mouseButton = (evt.buttons !== undefined) ? evt.buttons : evt.which;
        if (mouseButton) {
            updateQuickFontPanelOffset(evt);
        }
    }, false);

    function startListening() {
        document.addEventListener("keydown", keydown, false);
        document.addEventListener("keyup", keyup, false);
        document.addEventListener("keypress", keypress, false);
    }

    function stopListening() {
        document.removeEventListener("keydown", keydown);
        document.removeEventListener("keyup", keyup);
        document.removeEventListener("keypress", keypress);
    }

    function giveFocus(uid) {
        if (tools[uid]) {
            tools[uid].select();
        }
    }

    function init(titleRef) {
        startListening();
        title = titleRef;
    }

    function onload() {
        Object.keys(tools).forEach(function (key) {
            if (tools[key].onload !== undefined) {
                tools[key].onload();
            }
        });
    }

    function updateStatus(uid) {
        if (tools[uid] !== undefined) {
            tools[uid].updateStatus();
        }
    }

    function replaceCanvas(uid, canvas) {
        if (tools[uid] !== undefined && tools[uid].divCanvasContainer !== undefined) {
            tools[uid].divCanvasContainer.removeChild(tools[uid].canvas);
            canvas.style.verticalAlign = "bottom";
            if (canvas.style.width !== undefined) {
                tools[uid].divCanvasContainer.style.width = canvas.style.width;
            } else {
                tools[uid].divCanvasContainer.style.width = canvas.width + "px";
            }
            tools[uid].canvas = canvas;
            tools[uid].divCanvasContainer.appendChild(canvas);
        }
    }

    function replaceQuickAccess(uid, quickAccess) {
        if (tools[uid] !== undefined && tools[uid].quickAccess !== undefined) {
            quickAccessPanel.removeChild(tools[uid].quickAccess);
            quickAccess.style.verticalAlign = "bottom";
            tools[uid].quickAccess = quickAccess;
            quickAccessPanel.appendChild(quickAccess);
            quickAccessOffset = {"x": 8, "y": 8};
        }
    }

    function replaceQuickFontAccess(uid, quickFontAccess) {
        if (tools[uid] !== undefined && tools[uid].quickFontAccess !== undefined) {
            quickFontAccessPanel.removeChild(tools[uid].quickFontAccess);
            quickFontAccess.style.verticalAlign = "bottom";
            tools[uid].quickFontAccess = quickFontAccess;
            quickFontAccessPanel.appendChild(quickFontAccess);
            quickFontAccessOffset = {"x": 8, "y": 8};
        }
    }

    function changeToolClassName(uid, newClassName) {
        if (tools[uid] !== undefined) {
            tools[uid].div.className = "tool " + newClassName;
        }
    }

    function flashGreen(uid) {
        changeToolClassName(uid, "flash");
    }

    function flashRed(uid) {
        changeToolClassName(uid, "flash-red");
    }

    function modalEnd(uid) {
        if (tools[uid] !== undefined) {
            tools[uid].div.className = "tool";
        }
    }

    function sampleBlock(block) {
        Object.keys(tools).forEach(function (key) {
            if (tools[key].sampleBlock !== undefined) {
                if (tools[key].sampleBlock(block)) {
                    tools[key].select();
                    return;
                }
            }
        });
    }

    function getTitleText() {
        return title.getText();
    }

    function setTitleText(text) {
        title.setText(text);
    }

    function clearTitleText() {
        title.clearText();
    }

    return {
        "init": init,
        "editor": editor,
        "addTool": addTool,
        "sampleBlock": sampleBlock,
        "getCurrentTool": getCurrentTool,
        "getStates": getStates,
        "setStates": setStates,
        "startListening": startListening,
        "stopListening": stopListening,
        "giveFocus": giveFocus,
        "updateStatus": updateStatus,
        "replaceCanvas": replaceCanvas,
        "replaceQuickAccess": replaceQuickAccess,
        "replaceQuickFontAccess": replaceQuickFontAccess,
        "flashGreen": flashGreen,
        "flashRed": flashRed,
        "modalEnd": modalEnd,
        "getTitleText": getTitleText,
        "setTitleText": setTitleText,
        "clearTitleText": clearTitleText,
        "onload": onload
    };
}