window.TSMEmbeddingIndex={

 vectors:[],

 index(item){

  this.vectors.push(item);

 },

 search(vector){

  return this.vectors;

 }

};