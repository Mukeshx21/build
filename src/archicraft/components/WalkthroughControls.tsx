import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WalkthroughControlsProps {
  active: boolean;
}

export const WalkthroughControls: React.FC<WalkthroughControlsProps> = ({ active }) => {
  const { camera, gl } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});
  const moveSpeed = 4.5; // m/s
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  // Set camera height to eye level (1.65m) on activation
  useEffect(() => {
    if (active) {
      camera.position.y = 1.65;
    }
  }, [active, camera]);

  // Key listeners
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [active]);

  // Mouse drag look listeners on canvas
  useEffect(() => {
    if (!active) return;
    const dom = gl.domElement;

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };

      const euler = new THREE.Euler(0, 0, 0, 'YXZ');
      euler.setFromQuaternion(camera.quaternion);

      euler.y -= deltaX * 0.003;
      euler.x -= deltaY * 0.003;
      euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.x));

      camera.quaternion.setFromEuler(euler);
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [active, camera, gl.domElement]);

  // Frame update
  useFrame((_, delta) => {
    if (!active) return;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(camera.up, forward).normalize().negate();

    const moveVector = new THREE.Vector3();

    if (keys.current['keyw'] || keys.current['arrowup']) {
      moveVector.add(forward);
    }
    if (keys.current['keys'] || keys.current['arrowdown']) {
      moveVector.sub(forward);
    }
    if (keys.current['keyd'] || keys.current['arrowright']) {
      moveVector.add(right);
    }
    if (keys.current['keya'] || keys.current['arrowleft']) {
      moveVector.sub(right);
    }

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize().multiplyScalar(moveSpeed * delta);
      camera.position.add(moveVector);
      // Keep eye height
      camera.position.y = 1.65;
    }
  });

  return null;
};
