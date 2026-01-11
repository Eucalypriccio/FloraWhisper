import * as THREE from "three";
import { mixamoVRMRigMap } from "./mixamoVRMRigMap";
import type { VRM } from "@pixiv/three-vrm";

type FbxAssetLike = THREE.Object3D & { animations: THREE.AnimationClip[] };

export function remapMixamoAnimationToVrm(vrm: VRM, asset: FbxAssetLike) {
  const sourceClip =
    THREE.AnimationClip.findByName(asset.animations, "mixamo.com") ??
    asset.animations[0];

  if (!sourceClip) {
    throw new Error(
      "No AnimationClip found in FBX asset (expected 'mixamo.com' or first clip)."
    );
  }

  const clip = sourceClip.clone();
  const tracks: THREE.KeyframeTrack[] = [];

  const restRotationInverse = new THREE.Quaternion();
  const parentRestWorldRotation = new THREE.Quaternion();
  const quatA = new THREE.Quaternion();
  const vec3 = new THREE.Vector3();

  // Adjust with reference to hips height.
  const motionHipsHeight = asset.getObjectByName("mixamorigHips")?.position.y;
  const vrmHips = vrm.humanoid?.getNormalizedBoneNode("hips");

  const vrmHipsY = vrmHips?.getWorldPosition(vec3).y;
  const vrmRootY = vrm.scene.getWorldPosition(vec3).y;

  const vrmHipsHeight =
    vrmHipsY != null ? Math.abs(vrmHipsY - vrmRootY) : 1;
  const hipsPositionScale =
    motionHipsHeight != null && motionHipsHeight !== 0
      ? vrmHipsHeight / motionHipsHeight
      : 1;

  clip.tracks.forEach((track) => {
    const [mixamoRigName, propertyName] = track.name.split(".");
    const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
    if (!vrmBoneName) return;

    const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;
    const mixamoRigNode = asset.getObjectByName(mixamoRigName);

    if (!vrmNodeName || !mixamoRigNode) return;

    // Store rotations of rest-pose.
    mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
    mixamoRigNode.parent?.getWorldQuaternion(parentRestWorldRotation);

    if (track instanceof THREE.QuaternionKeyframeTrack) {
      // Retarget rotation of mixamoRig to NormalizedBone.
      for (let i = 0; i < track.values.length; i += 4) {
        const flatQuaternion = track.values.slice(i, i + 4);
        quatA.fromArray(flatQuaternion);

        // parentRestWorldRotation * trackRotation * restRotationInverse
        quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse);

        quatA.toArray(flatQuaternion);
        flatQuaternion.forEach((v, index) => {
          track.values[index + i] = v;
        });
      }

      tracks.push(
        new THREE.QuaternionKeyframeTrack(
          `${vrmNodeName}.${propertyName}`,
          track.times,
          track.values.map((v, i) =>
            vrm.meta?.metaVersion === "0" && i % 2 === 0 ? -v : v
          )
        )
      );
    } else if (track instanceof THREE.VectorKeyframeTrack) {
      const value = track.values.map((v, i) => {
        const flipped =
          vrm.meta?.metaVersion === "0" && i % 3 !== 1 ? -v : v;
        return flipped * hipsPositionScale;
      });

      tracks.push(
        new THREE.VectorKeyframeTrack(
          `${vrmNodeName}.${propertyName}`,
          track.times,
          value
        )
      );
    }
  });

  return new THREE.AnimationClip("vrmAnimation", clip.duration, tracks);
}
