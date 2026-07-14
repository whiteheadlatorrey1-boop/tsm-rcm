

const {test}=require("@playwright/test");


const pages = [

{
name:"01-intake",
url:"/html/tsm-doc-search-multi.html"
},


{
name:"02-healthcare-war-room",
url:"/html/healthcare/hc-denial-war-room.html"
},


{
name:"03-healthcare-strategist",
url:"/html/healthcare/hc-main-strategist.html"
},


{
name:"04-healthcare-executive",
url:"/html/healthcare/executive-portal.html"
},


{
name:"05-construction-strategist",
url:"/html/construction-suite/construction-strategist.html"
},


{
name:"06-construction-executive",
url:"/html/construction-suite/construction-executive-portal.html"
},


{
name:"07-bpo-war-room",
url:"/html/war-rooms/bpo/bpo-war-room.html"
},


{
name:"08-bpo-executive",
url:"/html/war-rooms/bpo/bpo-executive-portal.html"
},


{
name:"09-mdm-war-room",
url:"/html/war-rooms/mdm/mdm-war-room.html"
},


{
name:"10-mdm-executive",
url:"/html/war-rooms/mdm/mdm-executive-portal.html"
}

];


for(const pageData of pages){


test(
`Capture ${pageData.name}`,

async({page})=>{


await page.goto(
pageData.url,
{
waitUntil:"networkidle"
}
);


await page.screenshot({

path:
`reports/demo-evidence/${pageData.name}.png`,

fullPage:true

});


}

);


}

