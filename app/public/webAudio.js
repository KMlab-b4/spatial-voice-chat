
function createGainNode(audioContext, stream) {
  const gainNode = audioContext.createGain();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  gainNode.gain.value =1;

  return {id: stream.peerId, node: gainNode};
}

function allMute(gainNodes) {
  let gainNode;
  for(let i = 0; i < gainNodes.length; i++){
    gainNode = gainNodes[i]
    if(gainNode.node.gain.value){
      gainNode.node.gain.value = 0;
    }else{
      gainNode.node.gain.value = 1;
    }
  }
}
