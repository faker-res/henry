const http=require("http"),url=require("url"),fs=require("fs"),path=require("path"),env=require("./config/env").config(),cred=require("./config/cred"),theOtherEnv=require("./config/env").getAnotherConfig()[0],webEnv=require("./public/js/webEnv"),nodeUrl=env.redisUrl||"localhost",port=env.redisPort||1802,jwt=require("jsonwebtoken"),secret="$ap1U5eR$",crypto=require("crypto"),rp=require("request-promise"),privateKeyPath="./public/playerPhone.key.pem",replacedPrivateKeyPath="./public/playerPhone.key.pem.bak",publicKeyPath="./public/playerPhone.pub",replacedPublicKeyPath="./public/playerPhone.pub.bak",restartFPMSPath="./public/restartFPMS",fpmsKey="Fr0m_FPM$!",testKeyPairText="TEST ENCRYPTION",ts=jwt.sign(fpmsKey,secret),uh=crypto.createHash("md5").update(env.redisUrl).digest("hex");let privateKey,publicKey,replacedPrivateKey,replacedPublicKey;function getKeyFromOtherInstance(){let e=privateKey?Promise.resolve(privateKey):rp(o("playerPhone.key.pem",ts)).then(e=>{if(e){let r=cred.getHash(env.redisUrl);if(r===e){let e=cred.getCipherIV(r,fpmsKey);return rp(o("playerPhone.key.pem",e))}}}).then(e=>{e&&(console.log("SETTING PRIVATE KEY FROM ANOTHER INSTANCE"),privateKey=e)}).catch(e=>privateKey),r=replacedPrivateKey?Promise.resolve(replacedPrivateKey):rp(o("playerPhone.key.pem.bak",ts)).then(e=>{if(e){let r=cred.getHash(env.redisUrl);if(r===e){let e=cred.getCipherIV(r,fpmsKey);return rp(o("playerPhone.key.pem.bak",e))}}}).then(e=>{e&&(console.log("SETTING REPL PRIVATE KEY FROM ANOTHER INSTANCE"),replacedPrivateKey=e)}).catch(e=>replacedPrivateKey),t=publicKey?Promise.resolve(publicKey):rp(o("playerPhone.pub",ts)).then(e=>{if(e){let r=cred.getHash(env.redisUrl);if(r===e){let e=cred.getCipherIV(r,fpmsKey);return rp(o("playerPhone.pub",e))}}}).then(e=>{e&&(console.log("SETTING PUBLIC KEY FROM ANOTHER INSTANCE"),publicKey=e)}).catch(e=>publicKey),a=replacedPublicKey?Promise.resolve(replacedPublicKey):rp(o("playerPhone.pub.bak",ts)).then(e=>{if(e){let r=cred.getHash(env.redisUrl);if(r===e){let e=cred.getCipherIV(r,fpmsKey);return rp(o("playerPhone.pub.bak",e))}}}).then(e=>{e&&(console.log("SETTING REPL PUBLIC KEY FROM ANOTHER INSTANCE"),replacedPublicKey=e)}).catch(e=>replacedPublicKey);return Promise.all([e,r,t,a]);function o(e,r){let t=theOtherEnv.redisUrl;return theOtherEnv.redisPort&&(t+=":"+theOtherEnv.redisPort),t+="/",t+=e,t+="?token=",t+=r}}function validateHash(e,r){return e===crypto.createHash("md5").update(r).digest("hex")}http.createServer(function(e,r){console.log(`${e.method} ${e.url}`),r.setHeader("Access-Control-Allow-Origin","*"),r.setHeader("Access-Control-Request-Method","*"),r.setHeader("Access-Control-Allow-Methods","POST, GET, OPTIONS"),r.setHeader("Access-Control-Allow-Headers","*"),r.setHeader("Access-Control-Expose-Headers","Location");const t=url.parse(e.url,!0);let a=`./public${t.pathname}`,o=t.query;if("POST"===e.method)if(e.headers&&e.headers["x-token"])jwt.verify(e.headers["x-token"],env.socketSecret,function(t,o){if(t||!o)console.log("jwt verify error - POST",e.headers["x-token"],env.socketSecret,t),i();else{console.log(`${o.adminName} ${e.method} ${e.url}`);let t,i,n,s,c,l=[];switch(a){case publicKeyPath:console.log("SAVING IN EFFECT KEY PAIR"),e.on("data",e=>{l.push(e)}).on("end",()=>{t=Buffer.concat(l);try{(i=JSON.parse(t.toString()))&&i.privateKey&&i.publicKey?(n=crypto.privateEncrypt(i.privateKey,Buffer.from(testKeyPairText,"utf8")),s=crypto.publicDecrypt(i.publicKey,n),(c=s.toString())===testKeyPairText?(privateKey=i.privateKey,publicKey=i.publicKey,r.end("Success")):r.end("Invalid RSA Key Pair!")):r.end("Invalid RSA Key Pair!")}catch(e){console.log("error",e),r.end("Invalid RSA Key Pair!")}});break;case replacedPublicKeyPath:console.log("SAVING REPLACED KEY PAIR"),e.on("data",e=>{l.push(e)}).on("end",()=>{t=Buffer.concat(l);try{(i=JSON.parse(t.toString()))&&i.privateKey&&i.publicKey?(n=crypto.privateEncrypt(i.privateKey,Buffer.from(testKeyPairText,"utf8")),s=crypto.publicDecrypt(i.publicKey,n),(c=s.toString())===testKeyPairText?(replacedPrivateKey=i.privateKey,replacedPublicKey=i.publicKey,r.end("Success")):r.end("Invalid RSA Key Pair!")):r.end("Invalid RSA Key Pair!")}catch(e){console.log("error",e),r.end("Invalid RSA Key Pair!")}});break;case restartFPMSPath:console.log("REQUEST TO RESTART FPMS"),rp({method:"POST",uri:env.fpmsUpdateKeyAddress,body:{token:jwt.sign("Restart server",env.socketSecret),privateKey:Boolean(privateKey),publicKey:Boolean(publicKey),replPrivateKey:Boolean(replacedPrivateKey),replPublicKey:Boolean(replacedPublicKey)},json:!0}).then(()=>{r.end("Success")})}}});else{let t,a=[];e.on("data",e=>{a.push(e)}).on("end",()=>{t=Buffer.concat(a);try{let e=JSON.parse(t.toString());if(e.username&&e.password){let t=cred.getAdmin(e.username.toLowerCase());if(t)if(validateHash(t.password,e.password)){let e={adminInfo:t,loginTime:new Date};r.end(JSON.stringify({success:!0,token:jwt.sign(e,env.socketSecret)}))}else r.end(JSON.stringify({success:!1,error:{name:"InvalidPassword",message:"Password or user name is not correct!"}}));else r.end(JSON.stringify({success:!1,error:{name:"InvalidPassword",message:"Wrong credential!"}}))}}catch(e){console.log("error",e),r.end(JSON.stringify({success:!1,error:{name:"InvalidPassword",message:"Error occured!"}}))}})}else if("GET"===e.method)switch(a){case privateKeyPath:n(o,r,privateKey);break;case replacedPrivateKeyPath:n(o,r,replacedPrivateKey);break;case publicKeyPath:n(o,r,publicKey);break;case replacedPublicKeyPath:n(o,r,replacedPublicKey);break;case"./public/login.html":s(a,r);break;case"./public/static.html":o&&o.token?jwt.verify(o.token,env.socketSecret,function(t,o){t||!o?(console.log("jwt verify error",t),i()):(console.log(`${o.adminName} ${e.method} ${e.url}`),s(a,r))}):i();break;case"./public/static.htm":case"./":i();break;default:s(a,r)}else"OPTIONS"===e.method&&r.end();function i(){r.writeHead(302,{location:"/login.html"}),r.end()}function n(e,r,t){e&&e.token?jwt.verify(e.token,secret,(a,o)=>{if(!a&&o&&o===fpmsKey&&r.end(uh),a&&e.token){const a=e.token.split(":"),o=Buffer.from(a.shift(),"hex"),i=Buffer.from(a.join(":"),"hex"),n=crypto.createDecipheriv("aes-256-ctr",uh,o);let s=n.update(i,"hex","utf8");(s+=n.final("utf8"))===fpmsKey?r.end(t):r.end()}}):i()}function s(e,r){const t=path.parse(e).ext,a={".ico":"image/x-icon",".html":"text/html",".js":"text/javascript",".json":"application/json",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".wav":"audio/wav",".mp3":"audio/mpeg",".svg":"image/svg+xml",".pdf":"application/pdf",".doc":"application/msword"};fs.exists(e,function(o){console.log("exist",o),o||(e="public/login.html"),fs.readFile(e,function(e,o){e?(r.statusCode=500,r.end(`Error getting the file: ${e}.`)):(r.setHeader("Content-type",a[t]||"text/plain"),r.end(o))})})}}).listen(parseInt(port)),getKeyFromOtherInstance(),console.log(`Server listening on port ${port}`);