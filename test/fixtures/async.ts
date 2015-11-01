function wait(ms: number){
  return new Promise<string>((resolve, reject) => {
    setTimeout(() => {
      resolve("resolve");  
    }, ms);
  })
}

var result = async () =>{
  return await wait(1000);
};
console.log(result);