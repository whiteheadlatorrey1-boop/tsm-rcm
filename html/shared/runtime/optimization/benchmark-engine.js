global.TSMBenchmarkEngine = {

 benchmarks:{},

 record(domain,score){

  this.benchmarks[domain]=score;

 },

 report(){
  return this.benchmarks;
 }

};