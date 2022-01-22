require('fast-text-encoding')

import compile from 'wat-compiler'
import { cos, env, exp, fill, mod, sin } from '../src'

let memory
const make = (code: string) => {
  memory = new WebAssembly.Memory({
    initial: 16,
    maximum: 16,
    // shared: true,
  })

  const buffer = compile('(module ' + env() + code + ')')
  const mod = new WebAssembly.Module(buffer)
  const instance = new WebAssembly.Instance(mod, { env: { memory } }) as any
  return instance.exports as {
    fill(
      /** song position starting frame */
      startFrame: number,
      /** buffer length to fill */
      bufferLength: number,
      /** sample rate */
      sampleRate: number,
      /** input pointer */
      inputPtr: number,
      /** `f` routine params */
      ...args: number[]
    ): void
    f(x: number): number
  }
}

describe('fill()', () => {
  it('fills memory with the result of `f`', () => {
    const m = make(
      `;;wasm
      (func $f (result f32)
        (global.get $t)
      )
      ` + fill({ vars: [] })
    )

    m.fill(0, 10, 10, 0, 0, 0, 0)
    const floats = new Float32Array(memory.buffer, 0, 10)
    expect(floats).toMatchSnapshot()
  })

  it('can start at different frame', () => {
    const m = make(
      `;;wasm
      (func $f (result f32)
        (global.get $t)
      )
      ` + fill({ vars: [] })
    )

    m.fill(10, 10, 10, 0, 0, 0, 0)
    const floats = new Float32Array(memory.buffer, 0, 10)
    expect(floats).toMatchSnapshot()
  })

  it('accepts sample rate', () => {
    const m = make(
      `;;wasm
      (func $f (result f32)
        (global.get $t)
      )
      ` + fill({ vars: [] })
    )

    m.fill(0, 10, 20, 0, 0, 0, 0)
    const floats = new Float32Array(memory.buffer, 0, 10)
    expect(floats).toMatchSnapshot()
  })

  it('passes parameters to `f`', () => {
    const m = make(
      `;;wasm
      (func $f (param $a f32) (param $b f32) (param $c f32) (result f32)
        (f32.add (global.get $t)
        (f32.add (local.get $a)
        (f32.add (local.get $b) (local.get $c))))
      )
      ` + fill({ vars: ['a', 'b', 'c'] })
    )

    m.fill(0, 10, 10, 0, 1, 2, 3)
    const floats = new Float32Array(memory.buffer, 0, 10)
    expect(floats).toMatchSnapshot()
  })
})

describe('cos', () => {
  it('works', () => {
    const m = make(
      `;;wasm
      (func $f (export "f") (param $x f32) (result f32)
        (call $cos (local.get $x))
      )
      ` + cos
    )

    const x = [-2, -1, 0, 1, 2]
    expect(x.map(m.f)).toMatchSnapshot()
    expect(x.map(Math.cos)).toMatchSnapshot()
  })
})

describe('sin', () => {
  it('works', () => {
    const m = make(
      `;;wasm
      (func $f (export "f") (param $x f32) (result f32)
        (call $sin (local.get $x))
      )
      ` +
        cos + // sin depends on cos
        sin
    )

    const x = [-2, -1, 0, 1, 2]
    expect(x.map(m.f)).toMatchSnapshot()
    expect(x.map(Math.sin)).toMatchSnapshot()
  })
})

describe('exp', () => {
  it('works', () => {
    const m = make(
      `;;wasm
      (func $f (export "f") (param $x f32) (result f32)
        (call $exp (local.get $x))
      )
      ` + exp
    )

    const x = [-2, -1, 0, 1, 2]
    expect(x.map(m.f)).toMatchSnapshot()
    expect(x.map(Math.exp)).toMatchSnapshot()
  })
})

describe('mod', () => {
  it('works', () => {
    const m = make(
      `;;wasm
      (func $f (export "f") (param $x f32) (result f32)
        (call $mod (local.get $x) (f32.const 3.0))
      )
      ` + mod
    )

    const x = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]
    expect(x.map(m.f)).toMatchSnapshot()
    expect(x.map(x => x % 3)).toMatchSnapshot()
  })

  it('floats', () => {
    const m = make(
      `;;wasm
      (func $f (export "f") (param $x f32) (result f32)
        (call $mod (local.get $x) (f32.const 1.5))
      )
      ` + mod
    )

    const x = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]
    expect(x.map(m.f)).toMatchSnapshot()
    expect(x.map(x => x % 1.5)).toMatchSnapshot()
  })
})
