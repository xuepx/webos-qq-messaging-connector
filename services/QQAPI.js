if (typeof require === "undefined") {
    require = IMPORTS.require;
}

var http = require("http");
var qs = require("querystring");
var fs = require('fs');

var log=function(msg){
    var now=new Date();
    fs.open("/media/internal/qq.log","a",0644,function(e,fd){
        if(e) throw e;
        fs.write(fd,now.toUTCString()+msg+"\n",function(e){
            if(e) throw e;
            fs.closeSync(fd);
        })
    });
    //fs.writeFileSync("/media/internal/fetion.log", now.toUTCString()+msg, encoding='utf8');
}
var AjaxPost = function (host, path, params, cookies, callback) {
  var data = qs.stringify(params);
  var client = http.createClient(80, host);
  var headers;
  if (!!cookies) {
    headers = {
      'Host':host,
      'Cookie':cookies,
      'Content-Type':'application/json',
      'Content-Length':Buffer.byteLength(data, 'utf8'),
      'Connection':'keep-alive',
      'User-Agent':'Mozilla/5.0 (Windows NT 5.1; rv:14.0) Gecko/20100101 Firefox/14.0.1'
    };
  } else {
    headers = {
      'Host':host,
      'Content-Type':'application/json',
      'Content-Length':Buffer.byteLength(data, 'utf8'),
      'Connection':'keep-alive',
      'User-Agent':'Mozilla/5.0 (Windows NT 5.1; rv:14.0) Gecko/20100101 Firefox/14.0.1'
    };
  }

  var request = client.request('POST', path + '?' + data, headers);
  var body = '';
  request.on('response', function (response) {
    response.on('data', function (chunk) {
      body += chunk;
    });
    response.on('end', function () {
      if (response.statusCode != 200) {
        if (!!callback) {
          if (typeof response.headers['set-cookie'] == 'object') {
            callback({
              returnValue:false,
              responseText:body,
              cookie:response.headers['set-cookie'][0]
            });
          } else {
            callback({
              returnValue:false,
              responseText:body,
              cookie:response.headers['set-cookie']
            });
          }
        }
        return false;
      }
      if (!!callback) {
        if (typeof response.headers['set-cookie'] == 'object') {
          callback({
            returnValue:true,
            responseText:body,
            cookie:response.headers['set-cookie'][0]
          });
        } else {
          callback({
            returnValue:true,
            responseText:body,
            cookie:response.headers['set-cookie']
          });
        }
      }
      return true;
    });
  });
  // you'd also want to listen for errors in production
  request.write(data);
  request.end();
}
var AjaxGet = function (host, path, params, cookies, callback) {
  var data = qs.stringify(params);
  var client = http.createClient(80, host);
  var headers;
  if (!!cookies) {
    headers = {
      'Host':host,
      'Cookie':cookies,
      'Content-Type':'text/plain;charset=UTF-8',
      'Connection':'keep-alive',
      'User-Agent':'Mozilla/5.0 (Windows NT 5.1; rv:14.0) Gecko/20100101 Firefox/14.0.1'
    };
  } else {
    headers = {
      'Host':host,
      'Content-Type':'text/plain;charset=UTF-8',
      'Connection':'keep-alive',
      'User-Agent':'Mozilla/5.0 (Windows NT 5.1; rv:14.0) Gecko/20100101 Firefox/14.0.1'
    };
  }
  var request = client.request('GET', path+"?"+data, headers);
  var body = '';
  request.on('response', function (response) {
    response.on('data', function (chunk) {
      body += chunk;
    });
    response.on('end', function () {
      if (response.statusCode != 200) {
        if (!!callback) {
          if (typeof response.headers['set-cookie'] == 'object') {
            callback({
              returnValue:false,
              responseText:body,
              cookie:response.headers['set-cookie'][0]
            });
          } else {
            callback({
              returnValue:false,
              responseText:body,
              cookie:response.headers['set-cookie']
            });
          }
        }
        return false;
      }
      if (!!callback) {
        if (typeof response.headers['set-cookie'] == 'object') {
          callback({
            returnValue:true,
            responseText:body,
            cookie:response.headers['set-cookie'][0]
          });
        } else {
          callback({
            returnValue:true,
            responseText:body,
            cookie:response.headers['set-cookie']
          });
        }
        return true;
      }
    });
  });
  request.end();
}
var qqHost = "pt.3g.qq.com";
var loginPath = "/handleLogin";
var msgHost = "q32.3g.qq.com";
var msgPath = "/g/s";

var qqLogin = function(qq,pwd,callback){
  AjaxPost(qqHost,loginPath,{
    'r' :'324525157',
    'qq' :qq,
    'pwd' :pwd,
    'toQQchat' :'true',
    'q_from' :'',
    'modifySKey' :0,
    'loginType' :1
  },"",function(inResponse){
    if(inResponse.returnValue==true && inResponse.responseText.indexOf("登录成功")>=0){
      var sidRegExp = new RegExp("sid=([A-z\-0-9]{24})","gi");
      callback({returnValue:true,sid:sidRegExp.exec(inResponse.responseText)[1]});
      return;
    }
    callback({returnValue:false});
  });
}

var loginbysid = function(sid,callback){
  AjaxGet('pt.3g.qq.com','/s',{
    '3gqqsid':sid,
    aid:"nLogin3gqqbysid"
  },"",function(inResponse){
    callback(inResponse)
  });
}

var qqGetMsg = function(sid,callback){
  AjaxGet(msgHost,msgPath,{
    sid:sid,
    aid:"nqqChat",
    saveURL:0,
    r:1310115753,
    g_f:1653,
    on:1
  },"",function(inResponse){
    var unreadmsg={};
    var whoRegExp = new RegExp("与(.*?)聊天",'gi');
//    console.log(inResponse.responseText,whoRegExp.exec(inResponse.responseText));
    if(whoRegExp.test(inResponse.responseText)===false){
      if(inResponse.responseText.indexOf("正在跳转")>0){
        loginbysid(sid,function(inResponse0){
          callback({returnValue:false,errer:"reloginbysid"});
        });
        return;
      }else{
        callback({returnValue:false,errer:inResponse.responseText});
      }
    	return;
    }
    whoRegExp.exec(inResponse.responseText);
    unreadmsg.who=whoRegExp.exec(inResponse.responseText)[1];
    var msgRegExp = new RegExp("提示",'gi');//("提示<\/a>\)(.*?)<input name=\"msg\"",'gi');
    if(msgRegExp.test(inResponse.responseText)===true){
      var msgAllContent = inResponse.responseText.substring(inResponse.responseText.indexOf("提示</a>)")+7,inResponse.responseText.indexOf("<input name=\"msg\"")).replace('\r\n<br/>\r\n<br/>','');
      unreadmsg.msg=[];
      var msgList=msgAllContent.split("\r\n");
      for(var k=1;k<msgList.length-1;k+=3){
        unreadmsg.msg.push({
          content:msgList[k+2].replace(" <br/>",''),
          recTime:msgList[k+1].replace("<br/>",'')
        });
      }
      if(msgAllContent.length<3){
        callback({returnValue:false});
        return;
      }
      var qqRegExp = new RegExp('<postfield name="u" value="([0-9]*)"\/>','gi');
      if(qqRegExp.test(inResponse.responseText)==false){
      	callback({returnValue:false});
      }
      unreadmsg.whoqq=qqRegExp.exec(inResponse.responseText)[1];
      callback({returnValue:true,unread:unreadmsg});
    }else{
      callback({returnValue:false});
    }
  });
}

var qqSend = function(sid,who,msg,callback){
  AjaxPost(msgHost,msgPath+"?sid="+sid+"&aid=sendmsg&tfor=qq",{
    'sid' : sid,
    'on' : '1',
    'saveURL' : '0',
    'u' : who,
    'msg' : msg
  },"",function(inResponse){
    if(inResponse.responseText.indexOf("发送成功")>0){
      callback({returnValue:true});
    }else{
      callback({returnValue:false});
    }
  });
}