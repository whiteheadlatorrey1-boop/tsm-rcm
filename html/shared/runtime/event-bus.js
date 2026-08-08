(function(global){

const handlers={};

const EventBus={

publish(topic,payload){

(handlers[topic]||[]).forEach(fn=>{

try{

fn(payload);

}catch(e){

console.error(e);

}

});

},

subscribe(topic,fn){

handlers[topic]=handlers[topic]||[];

handlers[topic].push(fn);

},

unsubscribe(topic,fn){

handlers[topic]=(handlers[topic]||[]).filter(f=>f!==fn);

}

};

global.TSMEventBus=EventBus;

})(window);
