var Savers = (function () {
    "use strict";
    var DATATYPE_CHARACTER, DATATYPE_XBIN, FILETYPE_NONE, FILETYPE_ANSI;
    DATATYPE_CHARACTER = 1;
    DATATYPE_XBIN = 6;
    FILETYPE_NONE = 0;
    FILETYPE_ANSI = 1;

    function saveFile(bytes, mimeType, filename) {
        var downloadLink, blob, clickEvent, base64String, i;
        downloadLink = document.createElement("a");
        if ((navigator.userAgent.indexOf("Chrome") === -1) && (navigator.userAgent.indexOf("Safari") !== -1)) {
            base64String = "";
            for (i = 0; i < bytes.length; i += 1) {
                base64String += String.fromCharCode(bytes[i]);
            }
            downloadLink.href = "data:" + mimeType + ";base64," + btoa(base64String);
        } else {
            blob = new Blob([bytes], {"type": mimeType});
            downloadLink.href = URL.createObjectURL(blob);
        }
        downloadLink.download = filename;
        clickEvent = document.createEvent("MouseEvent");
        clickEvent.initEvent("click", true, true);
        downloadLink.dispatchEvent(clickEvent);
    }

    function addText(sauce, text, maxlength, index) {
        var i;
        for (i = 0; i < maxlength; i++) {
            sauce[i + index] = (i < text.length) ? text.charCodeAt(i) : 0x20;
        }
    }

    function createSauce(datatype, filetype, filesize, columns, rows, title, author, group, flags, fontName) {
        var sauce, date, month, day;
        sauce = new Uint8Array(129);
        sauce[0] = 26;
        sauce.set(new Uint8Array([0x53, 0x41, 0x55, 0x43, 0x45, 0x30, 0x30]), 1);
        addText(sauce, title, 35, 8);
        addText(sauce, author, 20, 43);
        addText(sauce, group, 20, 63);
        date = new Date();
        addText(sauce, date.getFullYear().toString(10), 4, 83);
        month = date.getMonth() + 1;
        addText(sauce, (month < 10) ? ("0" + month.toString(10)) : month.toString(10), 2, 87);
        day = date.getDate();
        addText(sauce, (day < 10) ? ("0" + day.toString(10)) : day.toString(10), 2, 89);
        sauce[91] = filesize & 0xff;
        sauce[92] = (filesize >> 8) & 0xff;
        sauce[93] = (filesize >> 16) & 0xff;
        sauce[94] = filesize >> 24;
        sauce[95] = datatype;
        sauce[96] = filetype;
        sauce[97] = columns & 0xff;
        sauce[98] = columns >> 8;
        sauce[99] = rows & 0xff;
        sauce[100] = rows >> 8;
        sauce[105] = 0;
        sauce[106] = flags;
        if (fontName !== undefined) {
            addText(sauce, fontName, fontName.length, 107);
        }
        return sauce;
    }

    return {
        "saveFile": saveFile,
        "createSauce": createSauce,
        "DATATYPE_CHARACTER": DATATYPE_CHARACTER,
        "DATATYPE_XBIN": DATATYPE_XBIN,
        "FILETYPE_NONE": FILETYPE_NONE,
        "FILETYPE_ANSI": FILETYPE_ANSI
    };
}());
