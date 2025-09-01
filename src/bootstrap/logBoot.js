function banner(msg){
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.position = 'fixed';
  el.style.top = '0';
  el.style.left = '0';
  el.style.right = '0';
  el.style.background = 'red';
  el.style.color = 'white';
  el.style.padding = '4px';
  el.style.fontFamily = 'sans-serif';
  el.style.zIndex = '10000';
  document.body.appendChild(el);
}

export async function gate(name, fn){
  console.log(`[BOOT] ${name} start`);
  try{
    const res = await fn();
    console.log(`[BOOT] ${name} finish`);
    return res;
  }catch(err){
    console.error(`[BOOT] ${name} failed`, err);
    banner(`${name} failed: ${err.message}`);
    throw err;
  }
}
