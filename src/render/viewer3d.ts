// Three.js による 3D 表示（Z 上、正射影、タッチ操作）
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Manifold } from 'manifold-3d';
import { toTriMesh, bboxOf, type TriMesh } from '../geometry/mesh';
import { featureEdgePositions } from '../geometry/hlr';
import type { Frame } from '../geometry/frame';
import type { Polys } from '../geometry/section';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

const css = (name: string, fb: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;

export function modelObject(t: TriMesh, opts: { color?: string; opacity?: number; edges?: boolean } = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(t.pos, 3));
  g.setIndex(new THREE.BufferAttribute(t.idx, 1));
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  g.dispose();
  const op = opts.opacity ?? 1;
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color ?? css('--model', '#8fb3d9'), roughness: 0.55, metalness: 0.1, flatShading: true,
    transparent: op < 1, opacity: op, depthWrite: op >= 1, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(ng, mat));
  if (opts.edges !== false) {
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.BufferAttribute(featureEdgePositions(t), 3));
    grp.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: css('--edge', '#1b2733'), transparent: op < 1, opacity: Math.min(1, op * 1.6) })));
  }
  return grp;
}


export class Viewer3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5000);
  readonly controls: OrbitControls;
  private root = new THREE.Group();
  private center = new THREE.Vector3();
  private size = 50;
  private dirty = true;
  private anim: ((t: number) => boolean) | null = null;
  // 座標軸インジケータ
  private triScene = new THREE.Scene();
  private triCam = new THREE.OrthographicCamera(-1.6, 1.6, 1.6, -1.6, 0.1, 10);

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.localClippingEnabled = true;
    host.appendChild(this.renderer.domElement);
    this.scene.add(this.root);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(0.4, 0.3, 1);
    this.camera.add(key);
    this.scene.add(this.camera);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.addEventListener('change', () => (this.dirty = true));
    // 平面図などで up を変えた後に指で回したら Z 上に戻す
    this.controls.addEventListener('start', () => {
      this.anim = null;
      if (this.camera.up.z < 0.999) { this.camera.up.set(0, 0, 1); this.controls.update(); }
    });
    this.buildTriad();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    const loop = (t: number) => {
      if (this.anim && !this.anim(t)) this.anim = null;
      if (this.dirty || this.anim) this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private buildTriad() {
    const mk = (dir: THREE.Vector3, color: number, label: string) => {
      this.triScene.add(new THREE.ArrowHelper(dir, new THREE.Vector3(), 1, color, 0.3, 0.18));
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d')!;
      g.fillStyle = '#' + color.toString(16).padStart(6, '0');
      g.font = 'bold 48px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, 32, 34);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
      sp.position.copy(dir).multiplyScalar(1.35);
      sp.scale.setScalar(0.5);
      this.triScene.add(sp);
    };
    mk(new THREE.Vector3(1, 0, 0), 0xe53935, 'X');
    mk(new THREE.Vector3(0, 1, 0), 0x43a047, 'Y');
    mk(new THREE.Vector3(0, 0, 1), 0x1e88e5, 'Z');
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px';
    this.renderer.domElement.style.height = h + 'px';
    const a = w / h, s = this.size * 0.75;
    this.camera.left = -s * Math.max(a, 1); this.camera.right = s * Math.max(a, 1);
    this.camera.top = s / Math.min(a, 1); this.camera.bottom = -s / Math.min(a, 1);
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  private draw() {
    this.dirty = false;
    const r = this.renderer;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    r.setScissorTest(false);
    r.setViewport(0, 0, w, h);
    r.autoClear = true;
    r.render(this.scene, this.camera);
    // 左下に座標軸
    const s = Math.min(76, w * 0.22);
    this.triCam.position.copy(this.camera.position).sub(this.controls.target).setLength(4);
    this.triCam.up.copy(this.camera.up);
    this.triCam.quaternion.copy(this.camera.quaternion);
    r.autoClear = false;
    r.setScissorTest(true);
    r.setScissor(4, 4, s, s);
    r.setViewport(4, 4, s, s);
    r.clearDepth();
    r.render(this.triScene, this.triCam);
    r.setScissorTest(false);
  }

  clear() {
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose();
    });
    this.root.clear();
    this.dirty = true;
  }

  /** 形状を表示し、標準の等角方向にカメラを置く */
  setShape(mesh: TriMesh) {
    this.clear();
    const bb = bboxOf(mesh);
    this.size = bb.size;
    this.center.set((bb.min[0] + bb.max[0]) / 2, (bb.min[1] + bb.max[1]) / 2, (bb.min[2] + bb.max[2]) / 2);
    this.root.add(modelObject(mesh));
    this.resetCamera();
    this.resize();
  }

  resetCamera() {
    this.anim = null;
    this.controls.target.copy(this.center);
    this.camera.up.set(0, 0, 1);
    this.camera.position.copy(this.center).add(new THREE.Vector3(1.0, -1.45, 0.95).setLength(this.size * 4));
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.center);
    this.controls.update();
    this.dirty = true;
  }

  /** 矢視方向を示す矢印（観察者側 +n から形状へ向かう） */
  addViewArrow(f: Frame, label = '') {
    const n = new THREE.Vector3(...f.n);
    const len = this.size * 0.5;
    const from = this.center.clone().add(n.clone().multiplyScalar(this.size * 0.62 + len));
    const color = css('--arrow', '#ff6d00');
    const ar = new THREE.ArrowHelper(n.clone().negate(), from, len, color, len * 0.35, len * 0.22);
    (ar.line.material as THREE.LineBasicMaterial).linewidth = 3;
    // 太く見せるため円柱の軸を追加
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(len * 0.05, len * 0.05, len * 0.7, 12), new THREE.MeshBasicMaterial({ color }));
    shaft.position.copy(from).add(n.clone().multiplyScalar(-len * 0.35));
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    this.root.add(ar, shaft);
    if (label) {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d')!;
      g.fillStyle = color; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(label, 32, 34);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
      sp.position.copy(from).add(n.clone().multiplyScalar(this.size * 0.12));
      sp.scale.setScalar(this.size * 0.22);
      this.root.add(sp);
    }
    this.dirty = true;
  }

  /** 切断面（半透明の赤い板） */
  addPlane(f: Frame, d: number) {
    const n = new THREE.Vector3(...f.n);
    const s = this.size * 1.5;
    const g = new THREE.PlaneGeometry(s, s);
    const color = css('--plane', '#e53935');
    const plane = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color }));
    const grp = new THREE.Group();
    grp.add(plane, border);
    grp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    // 形状中心を平面へ投影した点に置く
    const c = this.center.clone();
    grp.position.copy(c.sub(n.clone().multiplyScalar(c.dot(n) - d)));
    grp.renderOrder = 2;
    this.root.add(grp);
    this.dirty = true;
  }

  /** 答え合わせ：手前側を取り除き、断面を着色して見せる */
  revealSection(full: Manifold, f: Frame, d: number) {
    const n = f.n;
    const keep = full.trimByPlane([-n[0], -n[1], -n[2]], -d);
    const gone = full.trimByPlane(n, d);
    const km = toTriMesh(keep), gm = toTriMesh(gone);
    keep.delete(); gone.delete();
    this.clear();
    // 断面（平面上にある三角形）だけ別色
    const tol = this.size * 1e-4;
    const capIdx: number[] = [], restIdx: number[] = [];
    for (let t = 0; t < km.idx.length; t += 3) {
      let onPlane = true;
      for (let k = 0; k < 3; k++) {
        const v = km.idx[t + k] * 3;
        if (Math.abs(km.pos[v] * n[0] + km.pos[v + 1] * n[1] + km.pos[v + 2] * n[2] - d) > tol) onPlane = false;
      }
      (onPlane ? capIdx : restIdx).push(km.idx[t], km.idx[t + 1], km.idx[t + 2]);
    }
    this.root.add(modelObject({ pos: km.pos, idx: new Uint32Array(restIdx) }, { edges: false }));
    this.root.add(modelObject({ pos: km.pos, idx: new Uint32Array(capIdx) }, { color: css('--cap', '#ff7043'), edges: false }));
    const edges = new THREE.BufferGeometry();
    edges.setAttribute('position', new THREE.BufferAttribute(featureEdgePositions(km), 3));
    this.root.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: css('--edge', '#1b2733') })));
    // 取り除いた側はゴーストで、法線方向へ離していく
    const ghost = modelObject(gm, { opacity: 0.18 });
    this.root.add(ghost);
    const t0 = performance.now();
    const nv = new THREE.Vector3(...n);
    this.anim = (t) => {
      const k = Math.min(1, (t - t0) / 700);
      ghost.position.copy(nv).multiplyScalar(this.size * 0.6 * (1 - Math.pow(1 - k, 3)));
      return k < 1;
    };
    this.dirty = true;
    this.flyTo(f, 0.6);
  }

  /** カメラを指定方向（+n 側から見る）へ移動。mix=1 で真正面 */
  flyTo(f: Frame, mix = 1) {
    const from = this.camera.position.clone().sub(this.center).normalize();
    const iso = new THREE.Vector3(1.0, -1.45, 0.95).normalize();
    const target = new THREE.Vector3(...f.n).multiplyScalar(mix).add(iso.multiplyScalar(1 - mix)).normalize();
    const upFrom = this.camera.up.clone();
    const upTo = mix === 1 ? new THREE.Vector3(...f.v) : new THREE.Vector3(0, 0, 1);
    const dist = this.size * 4;
    const t0 = performance.now();
    const prev = this.anim;
    this.anim = (t) => {
      const alive = prev ? prev(t) : false;
      const k = Math.min(1, (t - t0) / 800);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const dir = from.clone().lerp(target, e).normalize();
      this.camera.position.copy(this.center).add(dir.multiplyScalar(dist));
      this.camera.up.copy(upFrom.clone().lerp(upTo, e).normalize());
      this.camera.lookAt(this.center);
      this.controls.target.copy(this.center);
      return k < 1 || alive;
    };
  }

  /** ヒント：切断面と立体表面の交線（見える部分のみ）を太線で表示 */
  showCutLines(polys: Polys, f: Frame, d: number) {
    const pts: number[] = [];
    const w = (x: number, y: number) => [0, 1, 2].map((k) => f.u[k] * x + f.v[k] * y + f.n[k] * d);
    for (const q of polys)
      for (let i = 0; i < q.length; i++) {
        const a = q[i], b = q[(i + 1) % q.length];
        pts.push(...w(a[0], a[1]), ...w(b[0], b[1]));
      }
    const g = new LineSegmentsGeometry();
    g.setPositions(pts);
    const mat = new LineMaterial({ color: new THREE.Color(css('--plane', '#e53935')).getHex(), linewidth: 4, worldUnits: false });
    mat.resolution.set(this.host.clientWidth, this.host.clientHeight);
    const line = new LineSegments2(g, mat);
    line.renderOrder = 3;
    this.root.add(line);
    this.dirty = true;
  }

  /** ヒント：透視表示（形状を半透明にし、稜線を奥まで表示） */
  setXray(on: boolean) {
    this.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.transparent = on;
        mesh.material.opacity = on ? 0.25 : 1;
        mesh.material.depthWrite = !on;
        mesh.material.needsUpdate = true;
      }
      const ls = o as THREE.LineSegments;
      if (ls.isLineSegments && !(o instanceof LineSegments2) && ls.material instanceof THREE.LineBasicMaterial && o.parent?.children.some((c) => (c as THREE.Mesh).isMesh)) {
        ls.material.depthTest = !on;
        ls.renderOrder = on ? 4 : 0;
        ls.material.needsUpdate = true;
      }
    });
    this.dirty = true;
  }

  setInteractive(on: boolean) {
    this.controls.enabled = on;
  }
}

/** 3D 形状を等角方向から描いた画像（選択肢用） */
export class Snapshotter {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5000);
  private holder = new THREE.Group();
  constructor(px = 320) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(px, px, false);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(0.4, 0.3, 1);
    this.camera.add(key);
    this.scene.add(this.camera, this.holder);
  }
  render(mesh: TriMesh): string {
    this.holder.clear();
    const obj = modelObject(mesh);
    this.holder.add(obj);
    const bb = bboxOf(mesh);
    const c = new THREE.Vector3((bb.min[0] + bb.max[0]) / 2, (bb.min[1] + bb.max[1]) / 2, (bb.min[2] + bb.max[2]) / 2);
    const s = bb.size * 0.82;
    Object.assign(this.camera, { left: -s, right: s, top: s, bottom: -s });
    this.camera.up.set(0, 0, 1);
    this.camera.position.copy(c).add(new THREE.Vector3(1.0, -1.45, 0.95).setLength(bb.size * 4));
    this.camera.lookAt(c);
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    obj.traverse((o) => { (o as THREE.Mesh).geometry?.dispose(); });
    return url;
  }
}
