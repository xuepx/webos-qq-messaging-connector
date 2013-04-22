if (typeof require === "undefined") {
    require = IMPORTS.require;
}

var Foundations = IMPORTS.foundations;
var DB = Foundations.Data.DB;
var Future = Foundations.Control.Future;
var PalmCall = Foundations.Comms.PalmCall;
var _ = IMPORTS.underscore._;
var Class = Foundations.Class;
var exec = IMPORTS.require('child_process').exec;

function calcSyncDateTime() {
    //
    // Get the current date/time and put it in the format Plaxo is expecting
    // i.e., "2005-01-01T00:00:00Z"
    //
    var d = new Date();
    var hour = d.getHours();
    var seconds = d.getSeconds();

    if (seconds < 10) seconds = "0" + seconds;
    if (hour < 10)  hour = "0" + hour;

    var syncDateTime = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + "T" + hour + ":" + d.getMinutes() + ":" + seconds + "Z";
    return(syncDateTime);
}


//...
//...Base64 encode/decode functions. Plaxo expects Base64 encoding for username/password.
//...
/**
 *  Base64 encode / decode
 *  http://www.webtoolkit.info/
 **/
var Base64 = {
    // private property
    _keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    // public method for encoding
    encode:function (input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;
        input = Base64._utf8_encode(input);
        while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            }
            else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
                this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
        }
        return output;
    },

    // public method for decoding
    decode:function (input) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        while (i < input.length) {

            enc1 = this._keyStr.indexOf(input.charAt(i++));
            enc2 = this._keyStr.indexOf(input.charAt(i++));
            enc3 = this._keyStr.indexOf(input.charAt(i++));
            enc4 = this._keyStr.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output = output + String.fromCharCode(chr1);

            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }
        }
        output = Base64._utf8_decode(output);

        return output;
    },
    // private method for UTF-8 encoding
    _utf8_encode:function (string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    },
    // private method for UTF-8 decoding
    _utf8_decode:function (utftext) {
        var string = "";
        var i = 0;
        var c = 0, c1 = 0, c2 = 0;

        while (i < utftext.length) {
            c = utftext.charCodeAt(i);
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if ((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i + 1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i + 1);
                c3 = utftext.charCodeAt(i + 2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }
        return string;
    }
};

var localCall = function (service, method, params, callBack) {
    exec('/usr/bin/luna-send -n 1 ' + service + '/' + method + ' \'' + JSON.stringify(params) + '\'',
        function (error, stdout, stderr) {
            if (error !== null) {
                callBack({returnValue:false, responseText:"error: " + JSON.stringify(stderr)});
                return;
            }
            var data = JSON.parse(stdout);
            if (data.returnValue === false) {
                callBack({returnValue:false, responseText:"error: " + JSON.stringify(data)});
                return;
            }
            callBack({returnValue:true, responseText:stdout});
        }
    );
};

var IM_LOGINSTATE_KIND = "cn.xuepx.qq.imloginstate:1";
var IM_MESSAGE_KIND = "cn.xuepx.qq.immessage:1";
var IM_COMMAND_KIND = "cn.xuepx.qq.imcommand:1";
var KIND_PREFIX = "cn.xuepx.*";
var IM_COMMAND_KIND = "cn.xuepx.qq.imcommand:1";
var IM_QQ_TYPE = "type_qq";
var UPDATE_INTERVAL = 300000;
var UPDATE_INTERVAL_ONLINE = 10000;

function queryFromAccountId(kind, accountId, where) {
    query = {
        "from":kind,
        "where":[
            {"prop":"accountId", "op":"=", "val":accountId}
        ]};
    if (where != undefined) {
        query.where.push(where);
    }
    return query;
}

var PalmAvailability = {
    ONLINE:0,
    MOBILE:1,
    IDLE:2, // Also BUSY
    INVISIBLE:3,
    OFFLINE:4,
    PENDING:5,
    NO_PRESENCE:6
};

var PalmLoginState = {
    OFFLINE:"offline",
    LOGGING_ON:"logging-on",
    GETTING_BUDDIES:"retrieving-buddies",
    ONLINE:"online",
    LOGGING_OFF:"logging-off"
};