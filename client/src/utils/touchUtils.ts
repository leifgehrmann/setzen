export function getTouchById(touches: TouchList, id: number): Touch|null {
  for (let i = 0; i < touches.length; i++) {
    if (touches[i].identifier === id) {
      return touches[i];
    }
  }
  return null;
}
