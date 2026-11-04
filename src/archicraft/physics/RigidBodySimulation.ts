// ==========================================================================
// REAL-TIME RIGID BODY PHYSICS SIMULATION ENGINE
// Symplectic Euler integration, gravity acceleration, contact impulse,
// Coulomb friction, and non-bouncy architectural settling.
// ==========================================================================

import { SceneObject } from "../types/studio"
import { calculateObjectPhysics } from "./GeometryPhysics"
import { getPhysicalMaterial } from "./MaterialPhysics"
import { testGroundPlaneContact, testBoxBoxContact } from "./CollisionSystem"
import { RigidBodyState, ContactPoint, GRAVITY_STANDARD } from "./types"

export class RigidBodySimulationWorld {
  public bodies: Map<string, RigidBodyState> = new Map()
  public contacts: ContactPoint[] = []
  public isRunning = false
  public gravity: [number, number, number] = [0, -GRAVITY_STANDARD, 0]
  public timeStep =
    1 / 60 // 60 Hz fixed timestep

  constructor() {
    this.reset()
  }

  /**
   * Initializes physics bodies from scene architectural objects.
   * By default, walls, slabs, roofs, columns, stairs are STATIC.
   * Furniture and test items can be toggled to DYNAMIC.
   */
  public initializeFromScene(
    objects: SceneObject[],
    dynamicObjectIds: Set<string> = new Set(),
  ) {
    this.bodies.clear()

    for (const obj of objects) {
      if (!obj.visible) continue
      const calc = calculateObjectPhysics(obj)
      const mat = getPhysicalMaterial(obj.materialId || "mat_concrete_raw")
      const isDynamic = dynamicObjectIds.has(obj.id)

      const state: RigidBodyState = {
        id: obj.id,
        objectId: obj.id,
        bodyType: isDynamic ? "dynamic" : "static",
        position: [...calc.centerOfMass],
        rotation: [0, 0, 0],
        linearVelocity: [0, 0, 0],
        angularVelocity: [0, 0, 0],
        mass: calc.massKg,
        inverseMass: isDynamic ? 1 / Math.max(0.1, calc.massKg) : 0,
        inertiaTensor: [...calc.principalInertia],
        inverseInertiaTensor: isDynamic
          ? [
              1 / Math.max(0.01, calc.principalInertia[0]),
              1 / Math.max(0.01, calc.principalInertia[1]),
              1 / Math.max(0.01, calc.principalInertia[2]),
            ]
          : [0, 0, 0],
        restitution: mat.restitution,
        friction: mat.frictionDynamic,
        isGrounded: false,
        boundingBox: { ...calc.boundingBox },
        initialPosition: [...calc.centerOfMass],
        initialRotation: [0, 0, 0],
      }

      this.bodies.set(obj.id, state)
    }
  }

  /**
   * Spawns a dynamic test prop (e.g. dropped sphere or test mass) for real-time physics demonstration.
   */
  public spawnTestMass(
    position: [number, number, number] = [0, 5, 0],
    massKg = 25.0,
  ): string {
    const id = `test_prop_${Date.now()}`
    const halfSize = 0.35
    const state: RigidBodyState = {
      id,
      objectId: id,
      bodyType: "dynamic",
      position: [...position],
      rotation: [0, 0, 0],
      linearVelocity: [0, 0, 0],
      angularVelocity: [Math.random() * 0.5, Math.random() * 0.5, 0],
      mass: massKg,
      inverseMass: 1 / massKg,
      inertiaTensor: [1.5, 1.5, 1.5],
      inverseInertiaTensor: [1 / 1.5, 1 / 1.5, 1 / 1.5],
      restitution: 0.15,
      friction: 0.45,
      isGrounded: false,
      boundingBox: {
        min: [
          position[0] - halfSize,
          position[1] - halfSize,
          position[2] - halfSize,
        ],
        max: [
          position[0] + halfSize,
          position[1] + halfSize,
          position[2] + halfSize,
        ],
        center: [...position],
        size: [halfSize * 2, halfSize * 2, halfSize * 2],
        volume: Math.pow(halfSize * 2, 3),
      },
      initialPosition: [...position],
      initialRotation: [0, 0, 0],
    }
    this.bodies.set(id, state)
    return id
  }

  /**
   * Advances the simulation by delta time using symplectic Euler integration.
   */
  public step(dt: number = this.timeStep) {
    const dynamicBodies: RigidBodyState[] = []
    const staticBodies: RigidBodyState[] = []

    for (const body of this.bodies.values()) {
      if (body.bodyType === "dynamic") {
        dynamicBodies.push(body)
      } else {
        staticBodies.push(body)
      }
    }

    if (dynamicBodies.length === 0) return

    // 1. Numerical Integration: Integrate Gravity & Forces
    for (const body of dynamicBodies) {
      // Linear acceleration a = F / m = g
      body.linearVelocity[0] += this.gravity[0] * dt
      body.linearVelocity[1] += this.gravity[1] * dt
      body.linearVelocity[2] += this.gravity[2] * dt

      // Air resistance damping (drag)
      body.linearVelocity[0] *= 0.998
      body.linearVelocity[1] *= 0.998
      body.linearVelocity[2] *= 0.998
      body.angularVelocity[0] *= 0.98
      body.angularVelocity[1] *= 0.98
      body.angularVelocity[2] *= 0.98

      // Integrate position x = x + v * dt
      body.position[0] += body.linearVelocity[0] * dt
      body.position[1] += body.linearVelocity[1] * dt
      body.position[2] += body.linearVelocity[2] * dt

      // Integrate rotation
      body.rotation[0] += body.angularVelocity[0] * dt
      body.rotation[1] += body.angularVelocity[1] * dt
      body.rotation[2] += body.angularVelocity[2] * dt

      // Update Bounding Box
      const halfX = body.boundingBox.size[0] / 2
      const halfY = body.boundingBox.size[1] / 2
      const halfZ = body.boundingBox.size[2] / 2
      body.boundingBox.min = [
        body.position[0] - halfX,
        body.position[1] - halfY,
        body.position[2] - halfZ,
      ]
      body.boundingBox.max = [
        body.position[0] + halfX,
        body.position[1] + halfY,
        body.position[2] + halfZ,
      ]
      body.boundingBox.center = [...body.position]
    }

    // 2. Collision Detection & Contact Resolution
    this.contacts = []

    for (const dBody of dynamicBodies) {
      dBody.isGrounded = false

      // A. Ground plane contact
      const groundContact = testGroundPlaneContact(
        dBody.boundingBox,
        dBody.id,
        0.0,
        dBody.restitution,
        dBody.friction,
      )
      if (groundContact) {
        this.contacts.push(groundContact)
        this.resolveContact(dBody, null, groundContact)
      }

      // B. Static obstacle contacts (floors, walls, stairs)
      for (const sBody of staticBodies) {
        const contact = testBoxBoxContact(
          dBody.boundingBox,
          sBody.boundingBox,
          dBody.id,
          sBody.id,
          dBody.restitution,
          dBody.friction,
        )
        if (contact) {
          this.contacts.push(contact)
          this.resolveContact(dBody, sBody, contact)
        }
      }
    }
  }

  /**
   * Resolves contact impulse and positional penetration correction.
   */
  private resolveContact(
    dynamicBody: RigidBodyState,
    staticBody: RigidBodyState | null,
    contact: ContactPoint,
  ) {
    // 1. Positional penetration correction (slop = 0.005)
    const slop = 0.005
    const correctionMagnitude = Math.max(0, contact.penetrationDepth - slop)
    dynamicBody.position[0] += contact.normal[0] * correctionMagnitude
    dynamicBody.position[1] += contact.normal[1] * correctionMagnitude
    dynamicBody.position[2] += contact.normal[2] * correctionMagnitude

    // 2. Normal Velocity & Impulse
    const normalVel =
      dynamicBody.linearVelocity[0] * contact.normal[0] +
      dynamicBody.linearVelocity[1] * contact.normal[1] +
      dynamicBody.linearVelocity[2] * contact.normal[2]

    // If moving towards surface, reflect with restitution
    if (normalVel < 0) {
      const e = Math.min(contact.restitution, 0.2) // Low architectural restitution
      const impulse = -(1 + e) * normalVel

      dynamicBody.linearVelocity[0] += contact.normal[0] * impulse
      dynamicBody.linearVelocity[1] += contact.normal[1] * impulse
      dynamicBody.linearVelocity[2] += contact.normal[2] * impulse

      if (contact.normal[1] > 0.7) {
        dynamicBody.isGrounded = true
      }

      // 3. Tangential Friction Impulse (Coulomb friction)
      const tangentVx =
        dynamicBody.linearVelocity[0] -
        contact.normal[0] * (normalVel + impulse)
      const tangentVz =
        dynamicBody.linearVelocity[2] -
        contact.normal[2] * (normalVel + impulse)
      const tangentSpeed = Math.sqrt(
        tangentVx * tangentVx + tangentVz * tangentVz,
      )

      if (tangentSpeed > 0.001) {
        const frictionCoeff = contact.friction
        const maxFrictionImpulse = Math.abs(impulse) * frictionCoeff
        const frictionRatio = Math.min(1.0, maxFrictionImpulse / tangentSpeed)

        dynamicBody.linearVelocity[0] -= tangentVx * frictionRatio * 0.85
        dynamicBody.linearVelocity[2] -= tangentVz * frictionRatio * 0.85
      }
    }

    // Resting contact velocity threshold threshold (sleep)
    if (
      Math.abs(dynamicBody.linearVelocity[1]) < 0.08 &&
      dynamicBody.isGrounded
    ) {
      dynamicBody.linearVelocity[1] = 0
      dynamicBody.linearVelocity[0] *= 0.8
      dynamicBody.linearVelocity[2] *= 0.8
      dynamicBody.angularVelocity = [0, 0, 0]
    }
  }

  /**
   * Resets simulation positions to original model state.
   */
  public reset() {
    this.contacts = []
    for (const body of this.bodies.values()) {
      body.position = [...body.initialPosition]
      body.rotation = [...body.initialRotation]
      body.linearVelocity = [0, 0, 0]
      body.angularVelocity = [0, 0, 0]
      body.isGrounded = false
    }
  }
}

// Singleton physics world instance
export const simulationWorld = new RigidBodySimulationWorld()
