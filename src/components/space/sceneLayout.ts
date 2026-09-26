// Layout responsivo de la escena: posiciones, escala y FOV por breakpoint.

import type * as THREE from 'three'

export interface StationLayout {
  end: THREE.Vector3Tuple
  focus: THREE.Vector3Tuple
  scale: number
  focusZoom: number
}

export interface SceneLayout {
  mobile: boolean
  fov: number
  namePosition: THREE.Vector3Tuple
  nameScale: number
  sunPosition: THREE.Vector3Tuple
  saturnX: number
  saturnY: number
  earthX: number
  earthY: number
  earthZ: number
  moonStart: THREE.Vector3Tuple
  venusX: number
  venusY: number
  venusZ: number
  marsX: number
  marsY: number
  marsZ: number
  stations: [StationLayout, StationLayout, StationLayout]
}

export function computeSceneLayout(width: number, height: number): SceneLayout {
  const aspect = width / Math.max(1, height)
  const mobile = width < 760
  const fov = aspect >= 1 ? 35 : Math.min(52, 35 + (1 - aspect) * 24)

  if (mobile) {
    return {
      mobile,
      fov,
      namePosition: [0, 1.38, 0],
      nameScale: 0.62,
      sunPosition: [-2.2, 2.55, -9.8],
      saturnX: 0,
      saturnY: -0.98,
      earthX: -0.15,
      earthY: 2.12,
      earthZ: -8.6,
      moonStart: [-2.5, -3.2, -9.2],
      venusX: 1.58,
      venusY: -2.46,
      venusZ: -8.3,
      marsX: -1.38,
      marsY: -2.72,
      marsZ: -9,
      stations: [
        { end: [0, 1.35, -1.2], focus: [0, 1.25, 1.7], scale: 0.44, focusZoom: 1.4 },
        { end: [0, -0.2, -1.5], focus: [0, -0.2, 2], scale: 0.4, focusZoom: 1.9 },
        { end: [0, -1.7, -1.8], focus: [0, -1.62, 1.95], scale: 0.4, focusZoom: 1.7 },
      ],
    }
  }

  const compact = width < 1100
  const scales: [number, number, number] = compact ? [0.56, 0.46, 0.45] : [0.62, 0.52, 0.5]
  return {
    mobile,
    fov,
    namePosition: [-3, 0.06, 0],
    nameScale: 0.76,
    sunPosition: [-6.3, 2.55, -10.6],
    saturnX: 2.88,
    saturnY: -0.04,
    earthX: -0.9,
    earthY: 2.12,
    earthZ: -8.95,
    moonStart: [-5.8, -2.8, -9.2],
    venusX: -3.35,
    venusY: -2.5,
    venusZ: -8.5,
    marsX: 1.65,
    marsY: -2.58,
    marsZ: -9.1,
    stations: [
      { end: [-2.55, 0.62, -0.95], focus: [-0.3, 0.35, 2.1], scale: scales[0], focusZoom: 2 },
      { end: [-0.2, -1.05, -1.45], focus: [-0.1, -0.95, 2.05], scale: scales[1], focusZoom: 2.7 },
      { end: [2.5, 0.55, -1.85], focus: [0.35, 0.5, 1.85], scale: scales[2], focusZoom: 2.7 },
    ],
  }
}
