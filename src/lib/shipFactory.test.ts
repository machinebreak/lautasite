import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { projects } from '../data/projects'
import { createShip, type StationPalette } from './shipFactory'

const palette: StationPalette = {
  accent: '#80a7d2',
  accentSoft: 'rgba(94,154,226,.23)',
  panel: '#234b82',
  panelLine: 'rgba(178,207,255,.42)',
  hull: 0x8d949d,
  light: 0x7fb6ff,
}

describe('shipFactory', () => {
  it.each(['explorer', 'racer', 'benchmark'] as const)(
    'builds a %s ship with console, hull monitor and nav lights',
    (variant) => {
      const bundle = createShip(projects[0], palette, variant)

      expect(bundle.group.name).toBe(`${projects[0].id}-ship`)
      expect(bundle.group.children.length).toBeGreaterThan(8)
      expect(bundle.hullMonitor.group.parent).toBe(bundle.group)
      expect(bundle.screenAssembly.parent).toBe(bundle.group)
      expect(bundle.screenMesh.material.map).toBeInstanceOf(THREE.CanvasTexture)
      expect(bundle.screenWorldWidth).toBeGreaterThan(0)
      expect(bundle.engineGlows.length).toBeGreaterThan(0)
      expect(bundle.engineTrailMaterials.length).toBeGreaterThan(0)
      expect(bundle.navLights.length).toBeGreaterThan(0)
      expect(bundle.hullMonitor.screenMaterial.map).toBe(bundle.standbyScreenTexture)
    },
  )

  it('keeps distinct silhouettes per variant', () => {
    const bundles = (['explorer', 'racer', 'benchmark'] as const).map((variant) =>
      createShip(projects[0], palette, variant),
    )
    const childCounts = bundles.map((bundle) => bundle.group.children.length)
    expect(new Set(childCounts).size).toBe(3)
    for (const bundle of bundles) {
      bundle.group.traverse((object) => {
        const mesh = object as THREE.Mesh
        if ('geometry' in mesh && mesh.geometry) mesh.geometry.dispose()
      })
    }
  })
})
