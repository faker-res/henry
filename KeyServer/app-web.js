const http=require("http"),url=require("url"),fs=require("fs"),path=require("path"),env=require("./config/env").config(),cred=require("./config/cred"),nonGatewayEnv=require("./config/env").getNonGatewayConfig()[0],port=env.redisPort||1802,jwt=require("jsonwebtoken"),crypto=require("crypto"),rp=require("request-promise"),publicKeyPath="./public/playerPhone.pub",replacedPublicKeyPath="./public/playerPhone.pub.bak",restartFPMSPath="./public/restartFPMS",testKeyPairText="TEST ENCRYPTION";function validateHash(e,t){return e===crypto.createHash("md5").update(t).digest("hex")}http.createServer(function(e,t){console.log(`${e.method} ${e.url}`),t.setHeader("Access-Control-Allow-Origin","*"),t.setHeader("Access-Control-Request-Method","*"),t.setHeader("Access-Control-Allow-Methods","POST, GET, OPTIONS"),t.setHeader("Access-Control-Allow-Headers","*"),t.setHeader("Access-Control-Expose-Headers","Location");const r=url.parse(e.url,!0);let n=`./public${r.pathname}`,o=r.query;if("POST"===e.method)if(e.headers&&e.headers["x-token"])jwt.verify(e.headers["x-token"],env.socketSecret,function(r,o){if(r||!o)console.log("jwt verify error - POST",e.headers["x-token"],env.socketSecret,r),a();else{console.log(`${o.adminName} ${e.method} ${e.url}`);let r,a,s,i,c,l=[];switch(n){case publicKeyPath:console.log("SAVING IN EFFECT KEY PAIR"),e.on("data",e=>{l.push(e)}).on("end",()=>{r=Buffer.concat(l);try{if((a=JSON.parse(r.toString()))&&a.privateKey&&a.publicKey)if(s=crypto.privateEncrypt(a.privateKey,Buffer.from(testKeyPairText,"utf8")),i=crypto.publicDecrypt(a.publicKey,s),(c=i.toString())===testKeyPairText)if(nonGatewayEnv&&nonGatewayEnv.redisUrl&&!a.isFromAnotherInstance){let r=nonGatewayEnv.redisUrl;nonGatewayEnv.redisPort&&(r+=":"+nonGatewayEnv.redisPort),r+=e.url,rp({method:"POST",uri:r,headers:{"x-token":e.headers["x-token"]},body:{privateKey:a.privateKey,publicKey:a.publicKey},json:!0}).then(()=>{t.end("Success")})}else t.end("Success");else t.end("Invalid RSA Key Pair!");else t.end("Invalid RSA Key Pair!")}catch(e){console.log("error",e),t.end("Invalid RSA Key Pair!")}});break;case replacedPublicKeyPath:console.log("SAVING REPLACED KEY PAIR"),e.on("data",e=>{l.push(e)}).on("end",()=>{r=Buffer.concat(l);try{if((a=JSON.parse(r.toString()))&&a.privateKey&&a.publicKey)if(s=crypto.privateEncrypt(a.privateKey,Buffer.from(testKeyPairText,"utf8")),i=crypto.publicDecrypt(a.publicKey,s),(c=i.toString())===testKeyPairText)if(nonGatewayEnv&&nonGatewayEnv.redisUrl&&!a.isFromAnotherInstance){let r=nonGatewayEnv.redisUrl;nonGatewayEnv.redisPort&&(r+=":"+nonGatewayEnv.redisPort),r+=e.url,rp({method:"POST",uri:r,headers:{"x-token":e.headers["x-token"]},body:{privateKey:a.privateKey,publicKey:a.publicKey},json:!0}).then(()=>{t.end("Success")})}else t.end("Success");else t.end("Invalid RSA Key Pair!");else t.end("Invalid RSA Key Pair!")}catch(e){console.log("error",e),t.end("Invalid RSA Key Pair!")}});break;case restartFPMSPath:if(console.log("REQUEST TO RESTART FPMS"),nonGatewayEnv&&nonGatewayEnv.redisUrl){let r=nonGatewayEnv.redisUrl;nonGatewayEnv.redisPort&&(r+=":"+nonGatewayEnv.redisPort),r+=e.url,rp({method:"POST",uri:r,headers:{"x-token":e.headers["x-token"]}}).then(()=>{t.end("Success")})}else t.end("Failed")}}});else{let r,n=[];e.on("data",e=>{n.push(e)}).on("end",async()=>{r=Buffer.concat(n);try{let e=JSON.parse(r.toString());if(e.username&&e.password){let r=await cred.getAdmin(e.username.toLowerCase());if(r)if(validateHash(r.password,e.password)){let e={adminInfo:r,loginTime:new Date};t.end(JSON.stringify({success:!0,token:jwt.sign(e,env.socketSecret)}))}else t.end(JSON.stringify({success:!1,error:{name:"InvalidPassword",message:"Password or user name is not correct!"}}));else t.end(JSON.stringify({success:!1,error:{name:"InvalidPassword",message:"Wrong credential!"}}))}}catch(e){console.log("error",e),t.end(JSON.stringify({success:!1,error:{name:"InvalidPassword",message:"Error occured!"}}))}})}else if("GET"===e.method)switch(n){case"./public/login.html":s(n,t);break;case"./public/static.html":o&&o.token?jwt.verify(o.token,env.socketSecret,function(r,o){r||!o?(console.log("jwt verify error",r),a()):(console.log(`${o.adminName} ${e.method} ${e.url}`),s(n,t))}):a();break;case"./public/static.htm":case"./":a();break;default:s(n,t)}else"OPTIONS"===e.method?t.end():"HEAD"===e.method&&t.end("ok");function a(){t.writeHead(302,{location:"/login.html"}),t.end()}function s(e,t){const r=path.parse(e).ext,n={".ico":"image/x-icon",".html":"text/html",".js":"text/javascript",".json":"application/json",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".wav":"audio/wav",".mp3":"audio/mpeg",".svg":"image/svg+xml",".pdf":"application/pdf",".doc":"application/msword"};fs.exists(e,function(o){console.log("exist",o),o||(e="public/login.html"),fs.readFile(e,function(e,o){e?(t.statusCode=500,t.end(`Error getting the file: ${e}.`)):(t.setHeader("Content-type",n[r]||"text/plain"),t.end(o))})})}}).listen(parseInt(port)),console.log(`Server listening on port ${port}`);