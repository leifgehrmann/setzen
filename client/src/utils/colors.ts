export const colors = [
  '#6d001a',
  '#be0039',
  '#ff4500',
  '#ffa800',
  '#ffd635',
  '#fff8b8',
  '#00a368',
  '#00cc78',
  '#7eed56',
  '#00756f',
  '#009eaa',
  '#00ccc0',
  '#2450a4',
  '#3690ea',
  '#51e9f4',
  '#493ac1',
  '#6a5cff',
  '#94b3ff',
  '#811e9f',
  '#b44ac0',
  '#e4abff',
  '#de107f',
  '#ff3881',
  '#ff99aa',
  '#6d482f',
  '#9c6926',
  '#ffb470',
  '#000000',
  '#515252',
  '#898d90',
  '#d4d7d9',
  '#ffffff'
]

export const labels = [
  'Burgandy',
  'Dark red',
  'Red',
  'Orange',
  'Yellow',
  'Pale yellow',
  'Dark green',
  'Green',
  'Light green',
  'Dark teal',
  'Teal',
  'Light teal',
  'Dark blue',
  'Blue',
  'Light blue',
  'Indigo',
  'Periwinkle',
  'Lavender',
  'Dark purple',
  'Purple',
  'Pale Purple',
  'Magenta',
  'Pink',
  'Light pink',
  'Dark brown',
  'Brown',
  'Beige',
  'Black',
  'Dark gray',
  'Gray',
  'Light gray',
  'White'
]

const keyCodes = [
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'KeyQ',
  'KeyW',
  'KeyE',
  'KeyR',
  'KeyT',
  'KeyY',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyG',
  'KeyH',
  'KeyZ',
  'KeyX',
  'KeyC',
  'KeyV',
  'KeyB',
  'KeyN',
  'Digit9',
  'Digit8',
  'Digit7',
  'KeyK',
  'KeyJ',
  'KeyG',
  'KeyI',
  'KeyU'
]

export const colorFloats = colors.map((color) => {
  const colorDecimal = parseInt('0x' + color.substring(1))
  return [
    ((colorDecimal>>16)&255)/255,
    ((colorDecimal>>8)&255)/255,
    (colorDecimal&255)/255
  ]
})

export function getColorIdFromKeyEvent (event: KeyboardEvent): number|null {
  const index = keyCodes.indexOf(event.code)
  return index !== -1 ? index : null
}
