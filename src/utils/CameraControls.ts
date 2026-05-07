import * as THREE from 'three';

const OPERATION = { ROTATE: 0, PAN: 1, ZOOM: 2 } as const;

interface CameraControlsOptions {
  enableDamping?: boolean;
  dampingFactor?: number;
  rotateSpeed?: number;
  panSpeed?: number;
  zoomSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
  mouseButtons?: { LEFT?: number; MIDDLE?: number; RIGHT?: number };
}

interface PointerRecord {
  clientX: number;
  clientY: number;
  button: number;
}

export class CameraControls {
  camera: THREE.Camera;
  domElement: HTMLElement;

  target = new THREE.Vector3();
  spherical = new THREE.Spherical();
  sphericalDelta = new THREE.Spherical();
  panOffset = new THREE.Vector3();

  enableDamping: boolean;
  dampingFactor: number;
  rotateSpeed: number;
  panSpeed: number;
  zoomSpeed: number;

  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  minAzimuthAngle: number;
  maxAzimuthAngle: number;

  mouseButtons: { LEFT: number; MIDDLE: number; RIGHT: number };

  _isDragging = false;
  _activePointerId: number | null = null;
  currentOperation: number | null = null;
  activePointers = new Map<number, PointerRecord>();
  initialPinchDistance: number | null = null;
  prevPinchCenter: { x: number; y: number } | null = null;

  _bound!: {
    onPointerDown: (e: PointerEvent) => void;
    onPointerMove: (e: PointerEvent) => void;
    onPointerUp: (e: PointerEvent) => void;
    onContextMenu: (e: Event) => void;
    onMouseWheel: (e: WheelEvent) => void;
    onMouseDown: (e: MouseEvent) => void;
    onDragStart: (e: DragEvent) => void;
    onSelectStart: (e: Event) => void;
    onGotPointerCapture: (e: PointerEvent) => void;
    onLostPointerCapture: (e: PointerEvent) => void;
    onMouseDownCapture: (e: MouseEvent) => void;
  };

  constructor(camera: THREE.Camera, domElement: HTMLElement, options: CameraControlsOptions = {}) {
    this.camera = camera;
    this.domElement = domElement;

    this.enableDamping = options.enableDamping !== false;
    this.dampingFactor = options.dampingFactor ?? 0.05;
    this.rotateSpeed = options.rotateSpeed ?? 1.0;
    this.panSpeed = options.panSpeed ?? 1.0;
    this.zoomSpeed = options.zoomSpeed ?? 1.0;

    this.minDistance = options.minDistance ?? 1;
    this.maxDistance = options.maxDistance ?? Infinity;
    this.minPolarAngle = options.minPolarAngle ?? 0;
    this.maxPolarAngle = options.maxPolarAngle ?? Math.PI;
    this.minAzimuthAngle = options.minAzimuthAngle ?? -Infinity;
    this.maxAzimuthAngle = options.maxAzimuthAngle ?? Infinity;

    this.mouseButtons = {
      LEFT: options.mouseButtons?.LEFT ?? 0,
      MIDDLE: options.mouseButtons?.MIDDLE ?? 0,
      RIGHT: options.mouseButtons?.RIGHT ?? 1,
    };

    this._bound = {
      onPointerDown: this._onPointerDown.bind(this),
      onPointerMove: this._onPointerMove.bind(this),
      onPointerUp: this._onPointerUp.bind(this),
      onContextMenu: this._onContextMenu.bind(this),
      onMouseWheel: this._onMouseWheel.bind(this),
      onMouseDown: this._onMouseDown.bind(this),
      onDragStart: this._onDragStart.bind(this),
      onSelectStart: this._onSelectStart.bind(this),
      onGotPointerCapture: this._onGotPointerCapture.bind(this),
      onLostPointerCapture: this._onLostPointerCapture.bind(this),
      onMouseDownCapture: this._onMouseDownCapture.bind(this),
    };

    this._connect();
    this._initStyles();
    this.updateSphericalFromCamera();
  }

  _connect() {
    const el = this.domElement;
    const doc = el.ownerDocument;
    const win = doc.defaultView || window;

    el.addEventListener('pointerdown', this._bound.onPointerDown);
    el.addEventListener('contextmenu', this._bound.onContextMenu);
    el.addEventListener('wheel', this._bound.onMouseWheel, { passive: false });
    el.addEventListener('mousedown', this._bound.onMouseDown);
    el.addEventListener('mousedown', this._bound.onMouseDownCapture, true);
    el.addEventListener('dragstart', this._bound.onDragStart);
    el.addEventListener('gotpointercapture', this._bound.onGotPointerCapture);
    el.addEventListener('lostpointercapture', this._bound.onLostPointerCapture);
    doc.addEventListener('selectstart', this._bound.onSelectStart);

    win.addEventListener('pointermove', this._bound.onPointerMove);
    el.addEventListener('pointermove', this._bound.onPointerMove);
    win.addEventListener('pointerup', this._bound.onPointerUp);
    win.addEventListener('pointercancel', this._bound.onPointerUp);
    el.addEventListener('pointercancel', this._bound.onPointerUp);
  }

  _disconnect() {
    const el = this.domElement;
    const doc = el.ownerDocument;
    const win = doc.defaultView || window;

    el.removeEventListener('pointerdown', this._bound.onPointerDown);
    el.removeEventListener('contextmenu', this._bound.onContextMenu);
    el.removeEventListener('wheel', this._bound.onMouseWheel);
    el.removeEventListener('mousedown', this._bound.onMouseDown);
    el.removeEventListener('mousedown', this._bound.onMouseDownCapture, true);
    el.removeEventListener('dragstart', this._bound.onDragStart);
    el.removeEventListener('gotpointercapture', this._bound.onGotPointerCapture);
    el.removeEventListener('lostpointercapture', this._bound.onLostPointerCapture);
    doc.removeEventListener('selectstart', this._bound.onSelectStart);

    win.removeEventListener('pointermove', this._bound.onPointerMove);
    el.removeEventListener('pointermove', this._bound.onPointerMove);
    win.removeEventListener('pointerup', this._bound.onPointerUp);
    win.removeEventListener('pointercancel', this._bound.onPointerUp);
    el.removeEventListener('pointercancel', this._bound.onPointerUp);
  }

  _initStyles() {
    const el = this.domElement;
    el.style.touchAction = 'none';
    el.style.userSelect = 'none';
    (el.style as any).webkitUserSelect = 'none';
    el.style.outline = 'none';
    el.style.cursor = 'grab';
    if (!el.getAttribute('tabindex')) {
      el.setAttribute('tabindex', '0');
    }
  }

  _onPointerDown(e: PointerEvent) {
    e.preventDefault();
    this.domElement.focus();

    this._isDragging = true;
    this._activePointerId = e.pointerId;

    this.domElement.setPointerCapture(e.pointerId);

    this.updateSphericalFromCamera();

    this.domElement.style.cursor = 'grabbing';

    this.activePointers.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
      button: e.button,
    });

    if (this.activePointers.size === 1) {
      this.currentOperation = this._buttonToOperation(e.button);
    } else if (this.activePointers.size === 2) {
      const pts = Array.from(this.activePointers.values());
      this.initialPinchDistance = Math.hypot(
        pts[0].clientX - pts[1].clientX,
        pts[0].clientY - pts[1].clientY
      );
      this._savePinchCenter(pts);
      this.currentOperation = OPERATION.PAN;
    }
  }

  _onPointerMove(e: PointerEvent) {
    if (!this._isDragging) return;
    if (e.pointerId !== this._activePointerId) return;

    e.preventDefault();

    const ptr = this.activePointers.get(e.pointerId);
    if (!ptr) return;

    const deltaX = e.clientX - ptr.clientX;
    const deltaY = e.clientY - ptr.clientY;
    ptr.clientX = e.clientX;
    ptr.clientY = e.clientY;

    if (this.activePointers.size === 1) {
      if (this.currentOperation === OPERATION.ROTATE) this._rotate(deltaX, deltaY);
      else if (this.currentOperation === OPERATION.PAN) this._pan(deltaX, deltaY);
      else if (this.currentOperation === OPERATION.ZOOM) this._zoom(-deltaY * 0.01);
    } else if (this.activePointers.size === 2) {
      this._handlePinchMove();
    }
  }

  _onPointerUp(e: PointerEvent) {
    if (e.pointerId !== this._activePointerId) return;

    try {
      this.domElement.releasePointerCapture(e.pointerId);
    } catch (_) {
      // may already be released
    }

    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size < 2) {
      this.initialPinchDistance = null;
      this.prevPinchCenter = null;
    }
    if (this.activePointers.size === 0) {
      this._isDragging = false;
      this._activePointerId = null;
      this.currentOperation = null;
      this.domElement.style.cursor = 'grab';
    }
  }

  _onGotPointerCapture(_e: PointerEvent) {
  }

  _onLostPointerCapture(e: PointerEvent) {
    if (this._isDragging && e.pointerId === this._activePointerId) {
      setTimeout(() => {
        if (!this._isDragging) return;
        try {
          this.domElement.setPointerCapture(e.pointerId);
        } catch (_) {
        }
      }, 0);
    }
  }

  _onMouseDownCapture(e: MouseEvent) {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  _onMouseDown(e: MouseEvent) {
    e.preventDefault();
  }

  _onContextMenu(e: Event) {
    e.preventDefault();
  }

  _onMouseWheel(e: WheelEvent) {
    e.preventDefault();
    this._zoom(e.deltaY * 0.001);
  }

  _onDragStart(e: DragEvent) {
    e.preventDefault();
  }

  _onSelectStart = (e: Event) => {
    if (this._isDragging) {
      e.preventDefault();
    }
  };

  _handlePinchMove() {
    const pts = Array.from(this.activePointers.values());
    const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
    if (this.initialPinchDistance) {
      const scale = dist / this.initialPinchDistance;
      this._zoom(1 - scale);
      this.initialPinchDistance = dist;
    }
    const center = {
      x: (pts[0].clientX + pts[1].clientX) / 2,
      y: (pts[0].clientY + pts[1].clientY) / 2,
    };
    if (this.prevPinchCenter) {
      this._pan(center.x - this.prevPinchCenter.x, center.y - this.prevPinchCenter.y);
    }
    this.prevPinchCenter = center;
  }

  _buttonToOperation(button: number): number {
    switch (button) {
      case 0: return this.mouseButtons.LEFT;
      case 1: return this.mouseButtons.MIDDLE;
      case 2: return this.mouseButtons.RIGHT;
      default: return OPERATION.ROTATE;
    }
  }

  _rotate(deltaX: number, deltaY: number) {
    const height = this.domElement.clientHeight;
    const dTheta = -(2 * Math.PI * deltaX / height) * this.rotateSpeed;
    const dPhi   = -(2 * Math.PI * deltaY / height) * this.rotateSpeed;
    this.sphericalDelta.theta += dTheta;
    this.sphericalDelta.phi   += dPhi;
  }

  _pan(deltaX: number, deltaY: number) {
    const rect = this.domElement.getBoundingClientRect();
    const distance = this.camera.position.distanceTo(this.target);
    const panSpeed = distance * 0.005 * this.panSpeed;
    const x = (deltaX / rect.width) * 2 * panSpeed;
    const y = (deltaY / rect.height) * 2 * panSpeed;
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    this.camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
    this.panOffset.add(right.multiplyScalar(-x));
    this.panOffset.add(up.multiplyScalar(y));
  }

  _zoom(delta: number) {
    this.sphericalDelta.radius += delta * this.zoomSpeed * Math.max(this.spherical.radius * 0.1, 0.01);
    const minDelta = this.minDistance - this.spherical.radius;
    const maxDelta = this.maxDistance === Infinity ? Infinity : this.maxDistance - this.spherical.radius;
    this.sphericalDelta.radius = Math.max(minDelta, Math.min(maxDelta, this.sphericalDelta.radius));
  }

  _savePinchCenter(pts: PointerRecord[]) {
    this.prevPinchCenter = {
      x: (pts[0].clientX + pts[1].clientX) / 2,
      y: (pts[0].clientY + pts[1].clientY) / 2,
    };
  }

  update() {
    if (this.enableDamping) {
      const apply = 1 - this.dampingFactor;
      this.spherical.theta += this.sphericalDelta.theta * apply;
      this.sphericalDelta.theta *= this.dampingFactor;
      this.spherical.phi += this.sphericalDelta.phi * apply;
      this.sphericalDelta.phi *= this.dampingFactor;
      this.spherical.radius += this.sphericalDelta.radius * apply;
      this.sphericalDelta.radius *= this.dampingFactor;
      this.target.add(this.panOffset.clone().multiplyScalar(apply));
      this.panOffset.multiplyScalar(this.dampingFactor);
    } else {
      this.spherical.theta += this.sphericalDelta.theta;
      this.spherical.phi   += this.sphericalDelta.phi;
      this.spherical.radius += this.sphericalDelta.radius;
      this.target.add(this.panOffset);
      this.sphericalDelta.set(0, 0, 0);
      this.panOffset.set(0, 0, 0);
    }

    this.spherical.phi = THREE.MathUtils.clamp(this.spherical.phi, this.minPolarAngle, this.maxPolarAngle);
    if (!(this.minAzimuthAngle === -Infinity && this.maxAzimuthAngle === Infinity)) {
      this.spherical.theta = THREE.MathUtils.clamp(this.spherical.theta, this.minAzimuthAngle, this.maxAzimuthAngle);
    }
    this.spherical.radius = THREE.MathUtils.clamp(this.spherical.radius, this.minDistance, this.maxDistance);

    this.camera.position.setFromSpherical(this.spherical).add(this.target);
    this.camera.lookAt(this.target);
  }

  updateSphericalFromCamera() {
    const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
    this.spherical.setFromVector3(offset);
  }

  setTarget(x: number | THREE.Vector3, y?: number, z?: number) {
    if (x instanceof THREE.Vector3) this.target.copy(x);
    else this.target.set(x, y ?? 0, z ?? 0);
    this.updateSphericalFromCamera();
  }

  dispose() {
    this.domElement.style.cursor = '';
    this._disconnect();
  }
}
