// TODO: we need to disable/cancel our Activity at onEnable with enabled: false
// TODO: probably also need to setup an activity that's name is based on the account name,
//       so that we have one activity per account, and then it should be cake to
//       know which account it wants us to work on.  Also, someone could have multiple
//       accounts for a service, with only one of them enabled for messaging (if you have more than one capability)
// TODO: I think I'd like to add a seperate file that actually handles the
//       login/authenticate/retrieve messages/send messages stuff, and mostly just
//       leave this file alone.

// NOTE: There are a few service calls to the Palm ActivityManager service
// in this source code, that are currently commented out.  I/We need to figure
// out how to properly get the ActivityManager to work to make the most efficient
// use of the database and built-in power saving functions of webOS.
// At the moment, I have wired a simple 5-minute sync timer that should sync
// incoming and outgoing messages at the same time.
// Ideally, we want to have the service as idle as possible, so we want to just
// wake it when a user actually inserts a message into the database.
// Personally, I'm not sure exactly how IM services that need a persistent
// connection are going to handle this, but hopefully we can come up with something
// there.
//
// Also, there is a bug in this that does not show the account type inside the
// messaging app's drop down status list.  I'm not certain, but I think that
// may be due to the example account setup not having a CONTACTS connector.

// Just a log to say we're present.  After installing the app/service, you can
// run "run-js-service -k /media/cryptofs/apps/usr/palm/services/your.service.directory"
// to see the actual output from the service.  That has been instrumental in helping me
// to figure out what's going on in here.  As well as "ls-monitor" to watch the
// service bus.
console.log("Loading serviceEndPoints *****************************************************");

// Here are a list of possible errors that you can return, using throw new Error("code") or future.setException(Error("code")) or some such
// maybe future.setException(Foundations.Err.create(error.code));
// Taken from the webOS 3.0 accounts app:
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

// Called to test your credentials given - this is specified in the account-template.json, under "validator"
// args = { "username": username entered, "password": password entered,
//          "templateId": our template, "config": { ? } }
// return a "credentials" object and a "config" object.  The "config" object will get passed to
// the onCreate function when your account is created.
//
// Use this to go to your online service, and verify that the login information
// given by the user works.  Return any credentials you will need to login to the
// system again (ie username, password, service key, whatever), so that they will
// be passed to onCreate, where you can save them.
// Also called when credentials stop working, such as an expired access code, or
// password change, and the user enters new information.
//
// I am not sure at this time what exactly is called when credentials stop working, or how
// it even determines that.  That part will require further research.

var checkCredentials = Class.create({
    run:function (future) {
        var args = this.controller.args;
        console.log("checkCredentials", args.username, args.password);
        qqLogin(args.username,args.password,function(inResponse){
          if(inResponse.returnValue===true){
            console.log(inResponse.sid);
            var B64_sid = Base64.encode(inResponse.sid);
            var B64username = Base64.encode(args.username);
            var B64password = Base64.encode(args.password);
            var keystore1 = { "keyname":"QQ_ID", "keydata":B64username, "type":"AES", "nohide":true};
            var keystore2 = { "keyname":"QQ_PWD", "keydata":B64password, "type":"AES", "nohide":true};
            var keystore3 = { "keyname":"QQ_SID", "keydata":B64_sid, "type":"AES", "nohide":true};
            localCall("palm://com.palm.keymanager", "store", keystore1, function (f1) {
              if (f1.returnValue === true) {
                localCall("palm://com.palm.keymanager", "store", keystore2, function (f2) {
                  if (f2.returnValue === true) {
                    localCall("palm://com.palm.keymanager", "store", keystore3, function (f3) {
//                                    future.result = f3;
                      if (f3.returnValue === true) {
                        future.result = {
                          returnValue:true,
                          credentials:{
                            common:{
                              password:args.password,
                              username:args.username
                            }
                          },
                          config:{
                            password:args.password,
                            username:args.username
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
          }else{
            future.result = {returnValue:false, errorCode:"401_UNAUTHORIZED"}; // Login ERROR
          }
        });
    }
});

// Called when your account is created from the Accounts settings, use this
// function to create any account specific information.  In this example,
// we're going to create a loginstate object, so the messaging app can see that
// we do, in fact, exist.
// specified in your account-template.json

// In SynerGV, I use this to load an additional database with the user's webOS account _id field,
// and their username, as well as configuration settings that are used on a per-account basis.
// args contains the accountId field, which is the webOS account _id, as well as the objects
// passed down from checkCredentials.

var onCreate = Class.create({
    run:function (future) {
        var args = this.controller.args;
        console.log("onCreate args=", JSON.stringify(args));

        // Setup permissions on the database objects so that our app can read/write them.
        // This is purely optional, and according to the docs here:
        // https://developer.palm.com/content/api/dev-guide/synergy/creating-synergy-contacts-package.html

        // You should be able to do this by specifying a file: service/configuration/db/kinds/cn.xuepx.qq.immessage
        // and then placing the contents of this permissions variable as JSON inside that file.
        // I am doing this from code, merely to present it since we can't comment system JSON.

        var permissions = [
            {
                type:"db.kind",
                object:IM_MESSAGE_KIND,
                caller:KIND_PREFIX,
                operations:{
                    read:"allow",
                    create:"allow",
                    delete:"allow",
                    update:"allow"
                }
            },
            {
                type:"db.kind",
                object:IM_MESSAGE_KIND,
                caller:"com.palm.*",
                operations:{
                    read:"allow",
                    create:"allow",
                    delete:"allow",
                    update:"allow"
                }
            },
            {
                type:"db.kind",
                object:IM_LOGINSTATE_KIND,
                caller:KIND_PREFIX,
                operations:{
                    read:"allow",
                    create:"allow",
                    delete:"allow",
                    update:"allow"
                }
            },
            {
                type:"db.kind",
                object:IM_LOGINSTATE_KIND,
                caller:"com.palm.*",
                operations:{
                    read:"allow",
                    create:"allow",
                    delete:"allow",
                    update:"allow"
                }
            },
            {
                type:"db.kind",
                object:IM_COMMAND_KIND,
                caller:KIND_PREFIX,
                operations:{
                    read:"allow",
                    create:"allow",
                    delete:"allow",
                    update:"allow"
                }
            },
            {
                type:"db.kind",
                object:IM_COMMAND_KIND,
                caller:"com.palm.*",
                operations:{
                    read:"allow",
                    create:"allow",
                    delete:"allow",
                    update:"allow"
                }
            }
        ];

        PalmCall.call("palm://com.palm.db/", "putPermissions", { permissions:permissions }).then(function (fut) {
            console.log("permissions put result=", JSON.stringify(fut.result));
            future.result = { returnValue:true, permissionsresult:fut.result };
        });
    }
});

// Called when your account is deleted from the Accounts settings, probably used
// to delete your account info and any stored data

var onDelete = Class.create({
    run:function (future) {
        var args = this.controller.args;
        var q = { "query":{ "from":IM_LOGINSTATE_KIND }};
        localCall("palm://com.palm.keymanager", "remove", { "keyname":"QQ_ID"}, function (ff1) {
            if (ff1.returnValue === true) {
                localCall("palm://com.palm.keymanager", "remove", { "keyname":"QQ_PWD"}, function (ff2) {
                    if (ff2.returnValue === true) {
                        localCall("palm://com.palm.keymanager", "remove", { "keyname":"QQ_SID"}, function (ff3) {
                            if (ff3.returnValue === true) {
                                localCall("palm://com.palm.db/", "del", q, function (f1) {
                                    console.log("del loginstate", f1);
                                    if (f1.returnValue === true) {
                                        future.result = f1;
                                    } else {
                                        future.result = f1;// { returnValue:false, responseText:"error: deltet imloginstate error"};
                                    }
                                });
                            } else {
                                future.result = { returnValue:false, responseText:"error: deltet QQ_SID error"};
                            }
                        });
                    } else {
                        future.result = { returnValue:false, responseText:"error: deltet QQ_PWD error"};
                    }
                });
            } else {
                future.result = { returnValue:false, responseText:"error: deltet QQ_ID error"};
            }
        });
    }
});

// This is called when multiple capabilities are turned on or off. I've not yet implemented this,
// as the only connectors I've implemented have had at most two capabilities, one or both of which
// were not able to be disabled.

var onCapabilitiesChanged = Class.create({
    run:function (future) {
        var args = this.controller.args;
        console.log("onCapabilitiesChanged", JSON.stringify(args));
    }
});

// Called when user has entered new, validated credentials
// Intended so that if you've been not syncing due to a credentials failure, then you'll know
// that it should be good to go again

var onCredentialsChanged = Class.create({
    run:function (future) {
        var args = this.controller.args;
        console.log("onCredentialsChanged", JSON.stringify(args));
    }
});

// Included as part of the template.  You may want to set up a database watch
// on your imstate objects, so you know when someone hits the "Offline" or
// "online" toggle in the Messaging app, so that you can login/logout.

var loginStateChanged = Class.create({
    run:function (future) {
//        var args = this.controller.args;
//        if (args.$activity && args.$activity.activityId) {
//            PalmCall.call("palm://com.palm.activitymanager/", "complete", {
//                activityId:args.$activity.activityId
//            });
//        }
//        var f1 = DB.find({"from":IM_LOGINSTATE_KIND});
//        f1.then(function (future) {
//            if (f1.result.results && f1.result.results.length <= 0) {
//                future.result = { returnValue:false };
//                return;
//            }
//            console.log(JSON.stringify(future.result));
//            // TODO: Here we're only get the first result ...
//            loginState = f1.result.results[0];
//            if (loginState.state === "online") {
//                loginState.state="offline";
//                DB.merge([loginState]).then(function (f2) {
//                    future.result = { returnValue:true };
//                });
//            }else{
//                loginState.state="online";
//                DB.merge([loginState]).then(function (f2) {
//                    localCall("palm://cn.xuepx.qq.service","startActivity",'{}',function(){
//                        future.result = { returnValue:true };
//                    });
//                });
//            }
//        });
        future.result = {r:JSON.stringify(args)};
        console.log("loginStateChanged", JSON.stringify(args));
    }
})

// Included as part of the template.  You might want to fill this in with
// your outgoing message code, to make it easy to call when needed.
var sendIM = Class.create({               //to DO======================================================================================
    run:function (future) {
        var args = this.controller.args;
        // get cookie
        var sid;
        localCall("palm://com.palm.keymanager", "fetchKey", { "keyname":"QQ_SID"}, function (f1) {
            if (f1.returnValue === false) {
                future.result = { returnValue:false, error:"error" };
                return;
            }
            sid = Base64.decode(JSON.parse(f1.responseText).keydata);
            // Search for pending messages
            var f = DB.find({
                "from":IM_MESSAGE_KIND,
                "where":[
                    {"op":"=", "prop":"status", "val":"pending"},
                    {"op":"=", "prop":"folder", "val":"outbox"}
                ]}).then(function (f2) {
                    if (f2.result.results.length <= 0) {
                        future.result = {returnValue:false};
                        return;
                    }
                    var msgList = [];
                    for (var i = 0; i < f2.result.results.length; i++) {
                        for (var k = 0; k < f2.result.results[i].to.length; k++) {
                            msgList.push({
                                "to":f2.result.results[i].to[k].addr.trim(),
                                "msg":f2.result.results[i].messageText
                            });
                        }
                    }
//                    future.result = { returnValue:true,to:msgList[0].to,msg:msgList[0].msg,cookies:cookies};
                    try {
                      if(msgList[0].msg=="@start"){
                        localCall("palm://cn.xuepx.qq.service", "sync",{"interval":UPDATE_INTERVAL_ONLINE});
                        f2.result.results[0].status = "successful";
                        DB.merge([ f2.result.results[0] ]);
                        if (msgList.length > 1) {
                          localCall("palm://cn.xuepx.qq.service", "sendIM", {});
                        }
                        msgList.slice(0);
                        future.result = { returnValue:true};
                        return;
                      }else{
                        if(msgList[0].msg=="@stop"){
                          localCall("palm://cn.xuepx.qq.service", "sync",{"interval":UPDATE_INTERVAL});
                          f2.result.results[0].status = "successful";
                          DB.merge([ f2.result.results[0] ]);
                          if (msgList.length > 1) {
                            localCall("palm://cn.xuepx.qq.service", "sendIM", {});
                          }
                          exec('luna-send -n 1 palm://com.palm.power/timeout/clear \'{"key":"cn.xuepx.qq.timer"}\'',function(){
                            future.result = { returnValue:true};
                            return;
                          });
                          return;
                        }
                      }
                      qqSend(sid,msgList[0].to, msgList[0].msg, function (f3) {
                        if (f3.returnValue === true) {
                          f2.result.results[0].status = "successful";
                        } else {
                          f2.result.results[0].status = "failed";
                        }
                        DB.merge([ f2.result.results[0] ]);
                        if (msgList.length > 1) {
                          localCall("palm://cn.xuepx.qq.service", "sendIM", {});
                        }else{
                          localCall("palm://cn.xuepx.qq.service", "sync",{});
                        }
                        msgList.slice(0);
                        future.result = { returnValue:true, msg:f3};
                      });
                    } catch (err) {
                        future.result = { returnValue:false};
                    }
                }
            );
        });
    },
    complete:function () {
//        localCall("palm://cn.xuepx.qq.service", "startActivity", {}, function (f1) {
//
//        });
    }
});

// When the Messaging program is told to Add a buddy, Block someone, or remove a Buddy, it will
// add your custom imcommand kind to the database.  If you need those functions, you should
// setup a watch on that database, and perform steps similar to this:

var sendCommand = Class.create({
    run:function (future) {
        var args = this.controller.args;
        console.log("sendCommand", JSON.stringify(args));

        var query = {
            from:"cn.xuepx.qq.imcommand:1",
            where:[
                { "prop":"status", "op":"=", "val":"pending" }
            ]
        };
        future.nest(DB.find(query, false, false).then(function (f) {
            var res = f.result.results;
            var mergeIds = [];
            for (var x = 0; x < res.length; x++) {
                mergeIds.push({ _id:res[x]._id, status:"successful" });
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
            f.result = { returnValue:true };
            future.result = { returnValue:true };
        }));

        return future;

    }
});

//
// Synergy service got 'onEnabled' message. When enabled, a sync should be started and future syncs scheduled.
// Otherwise, syncing should be disabled and associated data deleted.
// Account-wide configuration should remain and only be deleted when onDelete is called.
// onEnabled args should be like { accountId: "++Mhsdkfj", enabled: true }
//
// TODO: This function is a total mess, and should be re-written for the example.
// In SynerGV, this function is where we turn on and off the various database watches.

// Also, according to the webOS documentation, when disabling a capability (enabled: false), you
// should erase any stored data for that specific capability, but not for the account as a whole,
// as that data should remain in case they re-enable the capability.

var onEnabled = Class.create({
    run:function (future) {
        var args = this.controller.args;

        console.log("onEnabledAssistant args.enabled=", args.enabled);

        if (!args.enabled) {
            localCall("palm://com.palm.power/timeout/", "clear", {"key":"cn.xuepx.qq.timer"});
            future.result = { returnValue:true, debug:"debug.false"};
            return;
        }
        else {
            localCall("palm://com.palm.keymanager/", "fetchKey", { "keyname":"QQ_ID"}, function (f1) {
                if (f1.returnValue === true) {
                    DB.find({
                        "from":IM_LOGINSTATE_KIND}).then(function (f2) {
                            future.result = { returnValue:true };
                            if (f2.result.results.length < 1) {
                                var loginStateRec = {
                                    "objects":[
                                        {
                                            _kind:IM_LOGINSTATE_KIND,
                                            serviceName:IM_QQ_TYPE,
                                            accountId:args.accountId,
                                            username:Base64.decode(JSON.parse(f1.responseText).keydata),
                                            state:"online",
                                            availability:1
                                        }
                                    ]
                                };
                                DB.put(loginStateRec.objects).then(function (f3) {
                                    future.result = { returnValue:true };
                                });
                            } else {
                                f2.result.results[0].accountId = args.accountId;
                                f2.result.results[0].username = Base64.decode(JSON.parse(f1.responseText).keydata);
                                DB.merge([f2.result.results[0]]).then(function (f3) {
                                    future.result = { returnValue:true };
                                })
                            }
                        }
                    );
                } else {
                    future.result = { returnValue:false, error:"QQ_ID Not Found!" };
                }
            });
        }
    }
});


// Here's some possibly not well known things about the services that I'm learning while attempting to read the
// service code itself (which is in Javascript, but without knowing it's intentions, it's quite difficult to read
// for my skill level)
//
// The command assistants appear to be instances of Prototype js lib Classes.
// You should be able to do something like
//
// runCommandAssistant = Class.create({ run: ..., complete: ... })
//
// This would make it a lot more enyo-like in structure.
//
// Available functions that the service appears to call inside a class:
//
// setup - called before running a command (we should try to adopt a thing here, perhaps)
// commandTimeout - not a function, but apparently you can set the timeout for individual commands by setting a commandTimeout
//                  variable.  This will override the command's configured timeout or the service as a whole's timeout
// timeoutReceived - called when a command has reached it's timeout
// complete - called when a command run is completed
// cleanup - called after complete
// yield - called when a "yield" Event happens, whatever that means
// cancelSubscription - presumably called when a subscription is cancelled

// The "sync" assistant is normally called from the CONTACTS "Sync Now" button.
// This doesn't seem to be the case when a MESSAGING connector is added, but we're going
// to use this to fire off a database watch.  If you're going to be retrieving data from the
// internet (presumably!) you probably want to add a call to the Alarm function, so that you
// can get a wake up alert here.
// Keep in mind that Synergy can create multiple accounts of one type, so you probably want to dig up
// all possible accountinfos, and sync them all.

// TODO: Add support to the test app to inject accountId here

var startActivity = Class.create({
    run:function (activityFuture) {
        var args = this.controller.args;
        localCall("palm://com.palm.activitymanager/", "create",
        {
          start:true,
          activity:{
            name:"QQOutgoingSync", // + args.accountId,
            description:"QQ Pending Messages Watch",
            type:{
              foreground:true,
              power:true,
              powerDebounce:true,
              explicit:true,
              persist:true
            },
            requirements:{
              internet:true
            },
            trigger:{
              method:"palm://com.palm.db/watch",
              key:"fired",
              params:{
                subscribe:true,
                query:{
                  from:IM_MESSAGE_KIND,
                  where:[
                    { prop:"status", op:"=", val:"pending" },
                    { prop:"folder", op:"=", val:"outbox" }
                  ],
                  limit:1
                }
              }
            },
            callback:{
              method:"palm://cn.xuepx.qq.service/sendIM",
              params:{}
            }
          }
        }, function (f) {
          console.log("startActivity result=", JSON.stringify(f));
          activityFuture.result = f;
        }
      );
    }
});
var adoptActivity = function (accountId) {
    //var args = this.controller.args;
    localCall("palm://com.palm.activitymanager/", "adopt", {
        activityName:"QQOutgoingSync", // + accountId,
        wait:true,
        subscribe:true
    }, function (f) {
        if (f.returnValue === true) {
            return true;
        } else {
            return false;
        }
    });
}

var completeActivity = Class.create({
    run:function (completeFuture) {
        var args = this.controller.args;
        PalmCall.call("palm://com.palm.activitymanager/", "complete", {
            activityName:"QQOutgoingSync", // + args.accountId,
            restart:true,
            // the docs say you shouldn't need to specify the trigger and callback conditions again, i think..
            // someone else said reset the callback to a different function .. to avoid the "Temporarily Not Available" problem
            // other people say you do. so let's try it.
            trigger:{
                key:"fired",
                method:"palm://com.palm.db/watch",
                params:{
                    query:{
                        from:"cn.xuepx.qq.immessage:1",
                        where:[
                            { "prop":"folder", "op":"=", "val":"outbox" },
                            { "prop":"status", "op":"=", "val":"pending" }
                        ]
                    },
                    subscribe:true
                }
            }
        }).then(function (f) {
                console.log("completeActivity result", JSON.stringify(f.result));
                completeFuture.result = f.result;
            });
    }
});

var cancelActivity = Class.create({
    run:function (cancelFuture) {
        var args = this.controller.args;
        PalmCall.call("palm://com.palm.activitymanager/", "cancel", {
            activityName:"SynergyOutgoingSync"// + args.accountId
        }).then(function (f) {
                cancelFuture.result = f.result;
            });
    }
})

setWakeup = function (a) {
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
    var j = e + "/" + f + "/" + d.getUTCFullYear() + " " + g + ":" + h + ":" + i;//this.controller.args.interval
    exec('luna-send -n 1 palm://com.palm.power/timeout/set \'{"key":"cn.xuepx.qq.timer","at":"' + j + '","wakeup":true,"uri":"palm://cn.xuepx.qq.service/sync","params":{"interval":"'+a+'"}}\'')
}

var sync = Class.create({
    setup:function () {
        var args = this.controller.args;
        var future;
        console.log("sync setup start");
        return future;
    },
    run:function (syncFuture) {
        if(!this.controller.args.interval){}
        else{setWakeup(this.controller.args.interval);}
        //get sid;
        var sid;
        localCall("palm://com.palm.keymanager", "fetchKey", { "keyname":"QQ_SID"}, function (f1) {
            if (f1.returnValue === false) {
                syncFuture.result = { returnValue:false, error:"error" };
                return;
            }
            sid = Base64.decode(JSON.parse(f1.responseText).keydata);
            qqGetMsg(sid, function (inResponse) {
                if (inResponse.returnValue === true) {
                    var idMsgs = [];
                    var msgDb8 = [];
                    for (var k = 0; k < inResponse.unread.msg.length; k++) {
                        idMsgs.push(inResponse.unread.whoqq);
                        msgDb8.push({
                            "folder":"inbox",
                            "localTimestamp":new Date().getTime(),
                            "timestamp":new Date().getTime(),
                            "flags":{"read":false, "visible":true, "deliveryReport":false},
                            "messageText":inResponse.unread.msg[k].content,
                            "_kind":IM_MESSAGE_KIND,
                            "serviceName":IM_QQ_TYPE,
                            "status":"successful",
                            "from":{"addr":" " + inResponse.unread.whoqq, "name":inResponse.unread.who}
                        });
                    }
                    DB.put(msgDb8).then(function (f) {
                      localCall("palm://cn.xuepx.qq.service", "sync",{});
                      syncFuture.result = { returnValue:true };
                    });
                } else {
                    syncFuture.result = { returnValue:false, error:"error" };
                    return;
                }
            })
        });
    },
    complete:function () {

    }
})