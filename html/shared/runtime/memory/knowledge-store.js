window.TSMKnowledgeStore={

 records:[],

 add(entry){

  this.records.push(entry);

 },

 search(term){

  return this.records.filter(
   item =>
    JSON.stringify(item)
     .toLowerCase()
     .includes(term.toLowerCase())
  );

 }

};