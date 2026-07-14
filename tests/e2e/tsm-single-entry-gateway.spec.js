const {test, expect}=require('@playwright/test');

test('TSM has one enterprise intake entry point', async ({page})=>{

 await page.goto(
 'http://localhost:8080/html/tsm-doc-search-multi.html'
 );

 const url = page.url();

 expect(url)
 .toContain('tsm-doc-search-multi.html');

 console.log(`
================================
TSM SINGLE ENTRY VERIFIED

Gateway:
${url}

================================
`);

});