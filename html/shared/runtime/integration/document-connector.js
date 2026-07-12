window.TSMDocumentConnector = {

documents:[],

ingest(document){

this.documents.push(document);

return {

status:"INGESTED",

document

};

}

};