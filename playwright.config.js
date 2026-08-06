const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({

testDir:"tests/e2e",

timeout:60000,

retries:0,

reporter:[
["html"],
["list"]
],

use:{

baseURL:"http://localhost:8080",

headless:true,

ignoreHTTPSErrors:true,

screenshot:"only-on-failure",

video:"retain-on-failure",

trace:"retain-on-failure"

},

webServer:{

command:"node server.js",

url:"http://localhost:8080",

reuseExistingServer:true,

timeout:30000

}

});