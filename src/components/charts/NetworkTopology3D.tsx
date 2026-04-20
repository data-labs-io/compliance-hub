'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Settings
} from 'lucide-react'

interface NetworkNode {
  id: string
  name: string
  type: 'router' | 'switch' | 'firewall' | 'server' | 'endpoint'
  position: { x: number; y: number; z: number }
  status: 'online' | 'offline' | 'warning'
  connections: string[]
}

interface NetworkEdge {
  source: string
  target: string
  type: 'ethernet' | 'fiber' | 'wireless'
  bandwidth: number
}

const mockNodes: NetworkNode[] = [
  { id: 'core-1', name: 'Core Router 1', type: 'router', position: { x: 0, y: 0, z: 0 }, status: 'online', connections: ['dist-1', 'dist-2', 'fw-1'] },
  { id: 'core-2', name: 'Core Router 2', type: 'router', position: { x: 2, y: 0, z: 0 }, status: 'online', connections: ['dist-1', 'dist-2', 'fw-1'] },
  { id: 'dist-1', name: 'Distribution SW 1', type: 'switch', position: { x: -2, y: -2, z: 1 }, status: 'online', connections: ['acc-1', 'acc-2'] },
  { id: 'dist-2', name: 'Distribution SW 2', type: 'switch', position: { x: 4, y: -2, z: 1 }, status: 'warning', connections: ['acc-3', 'acc-4'] },
  { id: 'fw-1', name: 'Firewall 1', type: 'firewall', position: { x: 1, y: 2, z: 0 }, status: 'online', connections: ['server-1'] },
  { id: 'acc-1', name: 'Access SW 1', type: 'switch', position: { x: -4, y: -4, z: 2 }, status: 'online', connections: ['end-1', 'end-2'] },
  { id: 'acc-2', name: 'Access SW 2', type: 'switch', position: { x: -1, y: -4, z: 2 }, status: 'offline', connections: ['end-3'] },
  { id: 'acc-3', name: 'Access SW 3', type: 'switch', position: { x: 3, y: -4, z: 2 }, status: 'online', connections: ['end-4'] },
  { id: 'acc-4', name: 'Access SW 4', type: 'switch', position: { x: 6, y: -4, z: 2 }, status: 'online', connections: ['end-5'] },
  { id: 'server-1', name: 'Server Farm', type: 'server', position: { x: 1, y: 4, z: 1 }, status: 'online', connections: [] },
  { id: 'end-1', name: 'Endpoints 1-20', type: 'endpoint', position: { x: -6, y: -6, z: 3 }, status: 'online', connections: [] },
  { id: 'end-2', name: 'Endpoints 21-40', type: 'endpoint', position: { x: -2, y: -6, z: 3 }, status: 'online', connections: [] },
  { id: 'end-3', name: 'Endpoints 41-60', type: 'endpoint', position: { x: -1, y: -6, z: 3 }, status: 'offline', connections: [] },
  { id: 'end-4', name: 'Endpoints 61-80', type: 'endpoint', position: { x: 3, y: -6, z: 3 }, status: 'online', connections: [] },
  { id: 'end-5', name: 'Endpoints 81-100', type: 'endpoint', position: { x: 8, y: -6, z: 3 }, status: 'online', connections: [] },
]

export function NetworkTopology3D({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const animationRef = useRef<number>()
  const [isAnimating, setIsAnimating] = useState(true)
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)

  useEffect(() => {
    if (!mountRef.current) return

    // Capture ref value for cleanup function to avoid stale closure
    const currentMount = mountRef.current

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8fafc)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(10, 10, 10)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer
    mountRef.current.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // Create nodes
    const nodeObjects: { [key: string]: THREE.Mesh } = {}

    mockNodes.forEach(node => {
      let geometry: THREE.BufferGeometry
      let material: THREE.Material

      // Different shapes for different device types
      switch (node.type) {
        case 'router':
          geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8)
          material = new THREE.MeshLambertMaterial({
            color: node.status === 'online' ? 0x22c55e : node.status === 'warning' ? 0xf59e0b : 0xef4444
          })
          break
        case 'switch':
          geometry = new THREE.BoxGeometry(0.4, 0.1, 0.6)
          material = new THREE.MeshLambertMaterial({
            color: node.status === 'online' ? 0x0ea5e9 : node.status === 'warning' ? 0xf59e0b : 0xef4444
          })
          break
        case 'firewall':
          geometry = new THREE.ConeGeometry(0.3, 0.6, 6)
          material = new THREE.MeshLambertMaterial({
            color: node.status === 'online' ? 0xec4899 : node.status === 'warning' ? 0xf59e0b : 0xef4444
          })
          break
        case 'server':
          geometry = new THREE.BoxGeometry(0.8, 0.4, 0.4)
          material = new THREE.MeshLambertMaterial({
            color: node.status === 'online' ? 0x8b5cf6 : node.status === 'warning' ? 0xf59e0b : 0xef4444
          })
          break
        case 'endpoint':
          geometry = new THREE.SphereGeometry(0.2, 8, 6)
          material = new THREE.MeshLambertMaterial({
            color: node.status === 'online' ? 0x6b7280 : node.status === 'warning' ? 0xf59e0b : 0xef4444
          })
          break
        default:
          geometry = new THREE.SphereGeometry(0.2, 8, 6)
          material = new THREE.MeshLambertMaterial({ color: 0x6b7280 })
      }

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(node.position.x, node.position.y, node.position.z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData = node

      // Add click interaction
      mesh.addEventListener = () => {}

      scene.add(mesh)
      nodeObjects[node.id] = mesh
    })

    // Create connections (edges)
    mockNodes.forEach(node => {
      node.connections.forEach(connectionId => {
        const targetNode = mockNodes.find(n => n.id === connectionId)
        if (targetNode && nodeObjects[node.id] && nodeObjects[connectionId]) {
          const sourcePos = nodeObjects[node.id].position
          const targetPos = nodeObjects[connectionId].position

          const geometry = new THREE.BufferGeometry().setFromPoints([
            sourcePos,
            targetPos
          ])

          const material = new THREE.LineBasicMaterial({
            color: 0x94a3b8,
            transparent: true,
            opacity: 0.6
          })

          const line = new THREE.Line(geometry, material)
          scene.add(line)
        }
      })
    })

    // Mouse controls
    let mouseDown = false
    let mouseX = 0
    let mouseY = 0

    const onMouseDown = (event: MouseEvent) => {
      mouseDown = true
      mouseX = event.clientX
      mouseY = event.clientY
    }

    const onMouseUp = () => {
      mouseDown = false
    }

    const onMouseMove = (event: MouseEvent) => {
      if (!mouseDown) return

      const deltaX = event.clientX - mouseX
      const deltaY = event.clientY - mouseY

      camera.position.x = camera.position.x * Math.cos(deltaX * 0.01) + camera.position.z * Math.sin(deltaX * 0.01)
      camera.position.z = camera.position.z * Math.cos(deltaX * 0.01) - camera.position.x * Math.sin(deltaX * 0.01)
      camera.position.y += deltaY * 0.01

      camera.lookAt(0, 0, 0)

      mouseX = event.clientX
      mouseY = event.clientY
    }

    const onWheel = (event: WheelEvent) => {
      const scale = event.deltaY > 0 ? 1.1 : 0.9
      camera.position.multiplyScalar(scale)
      camera.lookAt(0, 0, 0)
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mouseup', onMouseUp)
    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('wheel', onWheel)

    // Animation loop
    const animate = () => {
      if (isAnimating) {
        // Rotate the entire scene slowly
        scene.rotation.y += 0.005
      }

      renderer.render(scene, camera)
      animationRef.current = requestAnimationFrame(animate)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (mountRef.current && camera && renderer) {
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mouseup', onMouseUp)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', handleResize)
      currentMount?.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [isAnimating])

  const resetView = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(10, 10, 10)
      cameraRef.current.lookAt(0, 0, 0)
    }
  }

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating)
  }

  const statusCounts = {
    online: mockNodes.filter(n => n.status === 'online').length,
    warning: mockNodes.filter(n => n.status === 'warning').length,
    offline: mockNodes.filter(n => n.status === 'offline').length,
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>3D Network Topology</CardTitle>
            <CardDescription>
              Interactive visualization of network infrastructure
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleAnimation}>
              {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={resetView}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Status Summary */}
        <div className="mb-4 flex gap-4">
          <Badge className="bg-green-100 text-green-700">
            Online: {statusCounts.online}
          </Badge>
          <Badge className="bg-yellow-100 text-yellow-700">
            Warning: {statusCounts.warning}
          </Badge>
          <Badge className="bg-red-100 text-red-700">
            Offline: {statusCounts.offline}
          </Badge>
        </div>

        {/* 3D Canvas */}
        <div
          ref={mountRef}
          className="w-full h-96 rounded-lg border bg-gradient-to-br from-gray-50 to-gray-100"
          style={{ cursor: 'grab' }}
        />

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full" />
            <span>Router</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-sky-500 rounded-sm" />
            <span>Switch</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-pink-500" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
            <span>Firewall</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded-sm" />
            <span>Server</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded-full" />
            <span>Endpoint</span>
          </div>
        </div>

        {/* Controls Help */}
        <div className="mt-4 text-xs text-gray-500">
          <p>🖱️ Drag to rotate • 🔄 Scroll to zoom • ⏸️ Pause/play animation</p>
        </div>
      </CardContent>
    </Card>
  )
}