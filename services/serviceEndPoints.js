//错误代码
/*
 "UNKNOWN_ERROR":                                accountsRb.$L("Unknown error"),
 "401_UNAUTHORIZED":                             accountsRb.$L("The account credentials you entered are incorrect. Try again."),
 "408_TIMEOUT":                                  accountsRb.$L("Request timeout"),
 "500_SERVER_ERROR":                             accountsRb.$L("Server error"),
 "503_SERVICE_UNAVAILABLE":              accountsRb.$L("Server unavailable"),
 "412_PRECONDITION_FAILED":              accountsRb.$L("The request is not suitable for the current configuration"),
 "400_BAD_REQUEST":                              accountsRb.$L("Bad request"),
 "HOST_NOT_FOUND":                               accountsRb.$L("Host not found"),
 "CONNECTION_TIMEOUT":                   accountsRb.$L("Connection timeout"),
 "CONNECTION_FAILED":                    accountsRb.$L("Connection failed"),
 "NO_CONNECTIVITY":                              accountsRb.$L("Must be connected to a network to sign in"),
 "ENOTFOUND":                                    accountsRb.$L("Must be connected to a network to sign in"),
 "SSL_CERT_EXPIRED":                             accountsRb.$L("SSL certificate expired"),
 "SSL_CERT_UNTRUSTED":                   accountsRb.$L("SSL certificate untrusted"),
 "SSL_CERT_INVALID":                             accountsRb.$L("SSL certificate invalid"),
 "SSL_CERT_HOSTNAME_MISMATCH":   accountsRb.$L("SSL certificate hostname mismatch"),
 "SINGLE_ACCOUNT_ONLY":                  accountsRb.$L("Only one account of this type can exist"),
 "TIMESTAMP_REFUSED":                    accountsRb.$L("Device date incorrect"),
 "DUPLICATE_ACCOUNT":                    accountsRb.$L("Duplicate account"),
 "UNSUPPORTED_CAPABILITY":               accountsRb.$L("Your account is not configured for this service."),
 "INVALID_EMAIL_ADDRESS":                accountsRb.$L("Please enter a valid email address."),
 "INVALID_USER":                                 accountsRb.$L("Invalid user"),
 "ACCOUNT_RESTRICTED":                   accountsRb.$L("User account restricted"),
 "ACCOUNT_LOCKED":                               accountsRb.$L("Your account is locked.  Please log in using a web browser"),
 "CALENDAR_DISABLED":                    accountsRb.$L("Your account does not have calendar enabled. Please log in to your account and
 */

//checkCredentials:登录验证
//功能：
//      1. QQ登录
//      2. 保存用户QQ帐号、密码、sid
var checkCredentials = Class.create({
    run: function(future) {
        var args = this.controller.args;
        console.log("checkCredentials", args.username, args.password);
        qqLogin(args.username, args.password, function(inResponse) {
            if (inResponse.returnValue === true) {
                console.log(inResponse.sid);
                var B64_sid = Base64.encode(inResponse.sid);
                var B64username = Base64.encode(args.username);
                var B64password = Base64.encode(args.password);
                var keystore1 = {
                    "keyname": "QQ_ID",
                    "keydata": B64username,
                    "type": "AES",
                    "nohide": true
                };
                var keystore2 = {
                    "keyname": "QQ_PWD",
                    "keydata": B64password,
                    "type": "AES",
                    "nohide": true
                };
                var keystore3 = {
                    "keyname": "QQ_SID",
                    "keydata": B64_sid,
                    "type": "AES",
                    "nohide": true
                };
                localCall("palm://com.palm.keymanager", "store", keystore1, function(f1) {
                    if (f1.returnValue === true) {
                        localCall("palm://com.palm.keymanager", "store", keystore2, function(f2) {
                            if (f2.returnValue === true) {
                                localCall("palm://com.palm.keymanager", "store", keystore3, function(f3) {
                                    //                                    future.result = f3;
                                    if (f3.returnValue === true) {
                                        future.result = {
                                            returnValue: true,
                                            credentials: {
                                                common: {
                                                    password: args.password,
                                                    username: args.username
                                                }
                                            },
                                            config: {
                                                password: args.password,
                                                username: args.username
                                            }
                                        };
                                    } else {
                                        future.result = f3;
                                    }
                                });
                            } else {
                                future.result = f2;
                            }
                        });
                    } else {
                        future.result = f1;
                    }
                });
            } else {
                future.result = {
                    returnValue: false,
                    errorCode: "401_UNAUTHORIZED"
                }; // Login ERROR
            }
        });
    }
});

//onCreate:帐号创建
var onCreate = Class.create({
    run: function(future) {}
});

//onDelete：帐号删除
//功能：
//      1. 删除保存的QQ帐号、密码、sid、登录状态数据库
var onDelete = Class.create({
    run: function(future) {
        var args = this.controller.args;
        var q = {
            "query": {
                "from": IM_LOGINSTATE_KIND
            }
        };
        localCall("palm://com.palm.keymanager", "remove", {
            "keyname": "QQ_ID"
        }, function(ff1) {
            if (ff1.returnValue === true) {
                localCall("palm://com.palm.keymanager", "remove", {
                    "keyname": "QQ_PWD"
                }, function(ff2) {
                    if (ff2.returnValue === true) {
                        localCall("palm://com.palm.keymanager", "remove", {
                            "keyname": "QQ_SID"
                        }, function(ff3) {
                            if (ff3.returnValue === true) {
                                localCall("palm://com.palm.db/", "del", q, function(f1) {
                                    console.log("del loginstate", f1);
                                    if (f1.returnValue === true) {
                                        future.result = f1;
                                    } else {
                                        future.result = f1; // { returnValue:false, responseText:"error: deltet imloginstate error"};
                                    }
                                });
                            } else {
                                future.result = {
                                    returnValue: false,
                                    responseText: "error: deltet QQ_SID error"
                                };
                            }
                        });
                    } else {
                        future.result = {
                            returnValue: false,
                            responseText: "error: deltet QQ_PWD error"
                        };
                    }
                });
            } else {
                future.result = {
                    returnValue: false,
                    responseText: "error: deltet QQ_ID error"
                };
            }
        });
    }
});

var onCapabilitiesChanged = Class.create({
    run: function(future) {
        var args = this.controller.args;
        console.log("onCapabilitiesChanged", JSON.stringify(args));
    }
});

//重新登录
var onCredentialsChanged = Class.create({
    run: function(future) {
        var args = this.controller.args;
        console.log("onCredentialsChanged", JSON.stringify(args));
    }
});


var loginStateChangedAssistant = function(future) {};

loginStateChangedAssistant.prototype.complete = function(activity) {
    return true;
};

loginStateChangedAssistant.prototype.run = function(response) {
    var args = this.controller.args;


    if (args.$activity && args.$activity.activityId) {
        PalmCall.call("palm://com.palm.activitymanager/", "complete", {
            activityId: args.$activity.activityId
        });
    }

    var loginState = {};

    var future = DB.find({
        "from": IM_LOGINSTATE_KIND
    });
    future.then(function(future) {
        if (future.result.results && future.result.results.length <= 0) {
            future.result = {
                returnValue: false
            };
            return;
        }
        console.log(JSON.stringify(future.result));
        // TODO: Here we're only get the first result ...
        loginState = future.result.results[0];
        log("loginStateChangedAssistant args: " + JSON.stringify(loginState));
        var sid;
        localCall("palm://com.palm.keymanager", "fetchKey", {
            "keyname": "QQ_SID"
        }, function(f1) {
            if (f1.returnValue === false) {
                future.result = {
                    returnValue: false,
                    error: "error"
                };
                return;
            }
            sid = Base64.decode(JSON.parse(f1.responseText).keydata);
            //在线时10秒接受一次消息
            //隐身时2分钟接受一次消息
            //离线停止计时器（不做退出）
            var statusCode;
            //在线时10秒接受一次消息
            //隐身时2分钟接受一次消息
            //离线停止计时器（不做退出）
            switch (loginState.availability) {
                case 0:
                    //在线
                    statusCode = '10';
                    localCall("palm://cn.xuepx.qq.service", "sync", {
                        "interval": UPDATE_INTERVAL_ONLINE
                    });
                    break;
                case 1:
                    //未知
                    break;
                case 2:
                    //正忙
                    statusCode = '30';
                    localCall("palm://cn.xuepx.qq.service", "sync", {
                        "interval": UPDATE_INTERVAL
                    });
                    break;
                case 3:
                    //隐身
                    statusCode = '40';
                    localCall("palm://cn.xuepx.qq.service", "sync", {
                        "interval": UPDATE_INTERVAL
                    });
                    break;
                case 4:
                    //离线
                    exec('luna-send -n 1 palm://com.palm.power/timeout/clear \'{"key":"cn.xuepx.qq.timer"}\'', function() {});
                    break;
            }
            qqStatusChange(sid, statusCode, function(res) {
                future.nest(createLoginStateActivity(loginState));
            });
        });
    });

    response.nest(future);
    return;
};

function createLoginStateActivity(loginState) {
    var f = DB.find(queryFromAccountId(IM_LOGINSTATE_KIND, loginState.accountId));
    f.then(function(f) {
        var rev = f.result.results[0]._rev;
        f.nest(PalmCall.call("palm://com.palm.activitymanager/", "create", {
            "start": true,
            "replace": true,
            "activity": {
                "name": "QQLoginStateSync",
                "description": "QQ Login State Watch",
                "type": {
                    "explicit": true,
                    "power": true,
                    "foreground": true,
                    "persist": true
                },
                "requirements": {
                    "internet": true
                },
                "trigger": {
                    "method": "palm://com.palm.db/watch",
                    "key": "fired",
                    "params": {
                        "subscribe": true,
                        "query": {
                            "from": "cn.xuepx.qq.imloginstate:1",
                            "where": [{
                                "prop": "_rev",
                                "op": ">",
                                "val": rev
                            }]
                        }
                    }
                },
                "callback": {
                    "method": "palm://cn.xuepx.qq.service/loginStateChanged",
                    "params": {}
                }
            }
        }));
    });
    return f;
}

//sendIM：发送消息
//功能：
//      1. 利用保存的sid从数据库中检索未发送的消息，将其发出，并更改状态
var sendIM = Class.create({
    run: function(future) {
        var args = this.controller.args;
        // get cookie
        var sid;
        localCall("palm://com.palm.keymanager", "fetchKey", {
            "keyname": "QQ_SID"
        }, function(f1) {
            if (f1.returnValue === false) {
                future.result = {
                    returnValue: false,
                    error: "error"
                };
                return;
            }
            sid = Base64.decode(JSON.parse(f1.responseText).keydata);
            // Search for pending messages
            var f = DB.find({
                "from": IM_MESSAGE_KIND,
                "where": [{
                    "op": "=",
                    "prop": "status",
                    "val": "pending"
                }, {
                    "op": "=",
                    "prop": "folder",
                    "val": "outbox"
                }]
            }).then(function(f2) {
                if (f2.result.results.length <= 0) {
                    future.result = {
                        returnValue: false
                    };
                    return;
                }
                var msgList = [];
                for (var i = 0; i < f2.result.results.length; i++) {
                    for (var k = 0; k < f2.result.results[i].to.length; k++) {
                        msgList.push({
                            "to": f2.result.results[i].to[k].addr.trim(),
                            "msg": f2.result.results[i].messageText
                        });
                    }
                }
                try {
                    qqSend(sid, msgList[0].to, msgList[0].msg, function(f3) {
                        if (f3.returnValue === true) {
                            f2.result.results[0].status = "successful";
                        } else {
                            f2.result.results[0].status = "failed";
                        }
                        DB.merge([f2.result.results[0]]);
                        if (msgList.length > 1) {
                            localCall("palm://cn.xuepx.qq.service", "sendIM", {});
                        } else {
                            localCall("palm://cn.xuepx.qq.service", "sync", {});
                        }
                        msgList.slice(0);
                        future.result = {
                            returnValue: true,
                            msg: f3
                        };
                    });
                } catch (err) {
                    future.result = {
                        returnValue: false
                    };
                }
            });
        });
    },
    complete: function() {
        //        localCall("palm://cn.xuepx.qq.service", "startActivity", {}, function (f1) {
        //
        //        });
    }
});

//sendCommand：命令
//功能：添加好友，删除好友、拉黑等（未测试）
var sendCommand = Class.create({
    run: function(future) {
        var args = this.controller.args;
        console.log("sendCommand", JSON.stringify(args));

        var query = {
            from: "cn.xuepx.qq.imcommand:1",
            where: [{
                "prop": "status",
                "op": "=",
                "val": "pending"
            }]
        };
        future.nest(DB.find(query, false, false).then(function(f) {
            var res = f.result.results;
            var mergeIds = [];
            for (var x = 0; x < res.length; x++) {
                mergeIds.push({
                    _id: res[x]._id,
                    status: "successful"
                });
                switch (res[x].command) {
                    case "blockBuddy":
                        if (res[x].params.block) {
                            // send block command for res[x].fromUsername on res[x].targetUsername
                        } else {
                            // send unblock command for res[x].fromUsername on res[x].targetUsername
                        }
                        break;
                    case "sendBuddyInvite":
                        // send buddy invite with message res[x].params.message for res[x].fromUsername to res[x].targetUsername
                        break;
                    case "deleteBuddy":
                        // remove buddy from buddy list for res[x].fromUsername to res[x].targetUsername
                        break;
                }
            }
            DB.merge(mergeIds);
            f.result = {
                returnValue: true
            };
            future.result = {
                returnValue: true
            };
        }));

        return future;

    }
});

//onEnabled：
//onEnabled(true)帐号创建后执行
//onEnabled(false)帐号删除时执行
var onEnabled = Class.create({
    run: function(future) {
        var args = this.controller.args;

        console.log("onEnabledAssistant args.enabled=", args.enabled);

        if (!args.enabled) {
            localCall("palm://com.palm.power/timeout/", "clear", {
                "key": "cn.xuepx.qq.timer"
            });
            future.result = {
                returnValue: true,
                debug: "debug.false"
            };
            return;
        } else {
            localCall("palm://com.palm.keymanager/", "fetchKey", {
                "keyname": "QQ_ID"
            }, function(f1) {
                if (f1.returnValue === true) {
                    DB.find({
                        "from": IM_LOGINSTATE_KIND
                    }).then(function(f2) {
                        future.result = {
                            returnValue: true
                        };
                        if (f2.result.results.length < 1) {
                            var loginStateRec = {
                                "objects": [{
                                    _kind: IM_LOGINSTATE_KIND,
                                    serviceName: IM_QQ_TYPE,
                                    accountId: args.accountId,
                                    username: Base64.decode(JSON.parse(f1.responseText).keydata),
                                    state: "online",
                                    availability: 0
                                }]
                            };
                            DB.put(loginStateRec.objects).then(function(f3) {
                                future.result = {
                                    returnValue: true
                                };
                            });
                        } else {
                            f2.result.results[0].accountId = args.accountId;
                            f2.result.results[0].username = Base64.decode(JSON.parse(f1.responseText).keydata);
                            DB.merge([f2.result.results[0]]).then(function(f3) {
                                future.result = {
                                    returnValue: true
                                };
                            })
                        }
                    });
                } else {
                    future.result = {
                        returnValue: false,
                        error: "QQ_ID Not Found!"
                    };
                }
            });
        }
    }
});

setWakeup = function(a) {
    log(" setWakeup");
    a = a < UPDATE_INTERVAL_ONLINE ? UPDATE_INTERVAL_ONLINE : a;
    var b = new Date();
    var c = b.getTime() + parseInt(a);
    var d = new Date(c);
    var e = (d.getUTCMonth() + 1) > 9 ? (d.getUTCMonth() + 1) : '0' + (d.getUTCMonth() + 1);
    var f = d.getUTCDate() > 9 ? d.getUTCDate() : '0' + d.getUTCDate();
    var g = d.getUTCHours() > 9 ? d.getUTCHours() : '0' + d.getUTCHours();
    var h = d.getUTCMinutes() > 9 ? d.getUTCMinutes() : '0' + d.getUTCMinutes();
    var i = d.getUTCSeconds() > 9 ? d.getUTCSeconds() : '0' + d.getUTCSeconds();
    var j = e + "/" + f + "/" + d.getUTCFullYear() + " " + g + ":" + h + ":" + i; //this.controller.args.interval
    exec('luna-send -n 1 palm://com.palm.power/timeout/set \'{"key":"cn.xuepx.qq.timer","at":"' + j + '","wakeup":true,"uri":"palm://cn.xuepx.qq.service/sync","params":{"interval":"' + a + '"}}\'')
}

var sync = Class.create({
    setup: function() {
        var args = this.controller.args;
        var future;
        console.log("sync setup start");
        return future;
    },
    run: function(syncFuture) {
        if (!this.controller.args.interval) {} else {
            setWakeup(this.controller.args.interval);
        }
        //get sid;
        var sid;
        localCall("palm://com.palm.keymanager", "fetchKey", {
            "keyname": "QQ_SID"
        }, function(f1) {
            if (f1.returnValue === false) {
                syncFuture.result = {
                    returnValue: false,
                    error: "error"
                };
                return;
            }
            sid = Base64.decode(JSON.parse(f1.responseText).keydata);
            qqGetMsg(sid, function(inResponse) {
                if (inResponse.returnValue === true) {
                    var idMsgs = [];
                    var msgDb8 = [];
                    for (var k = 0; k < inResponse.unread.msg.length; k++) {
                        idMsgs.push(inResponse.unread.whoqq);
                        var messageText = inResponse.unread.msg[k].content.replace("http://183.203.17.55/images/emo2009", '/media/internal/appdata/.qqemotion');
                        log(messageText);
                        msgDb8.push({
                            "folder": "inbox",
                            "localTimestamp": new Date().getTime(),
                            "timestamp": new Date().getTime(),
                            "flags": {
                                "read": false,
                                "visible": true,
                                "deliveryReport": false
                            },
                            "messageText": messageText,
                            "_kind": IM_MESSAGE_KIND,
                            "serviceName": IM_QQ_TYPE,
                            "status": "successful",
                            "from": {
                                "addr": " " + inResponse.unread.whoqq,
                                "name": inResponse.unread.who
                            }
                        });
                    }
                    DB.put(msgDb8).then(function(f) {
                        localCall("palm://cn.xuepx.qq.service", "sync", {});
                        syncFuture.result = {
                            returnValue: true
                        };
                    });
                } else {
                    syncFuture.result = {
                        returnValue: false,
                        error: "error"
                    };
                    return;
                }
            })
        });
    },
    complete: function() {

    }
})