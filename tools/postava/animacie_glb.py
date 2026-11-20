# Rýchly export len kostry a animácií (na ladenie): python animacie_glb.py /tmp/animacie.glb
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import blender_util as BU
import model as MD
import animacie

BU.vycisti_scenu()
m = MD.Model()
arm = BU.armatura('kostra', m.kosti, m.mena_kosti)
animacie.vytvor(arm, m, print)
bpy.ops.export_scene.gltf(filepath=sys.argv[1], export_format='GLB', export_animations=True,
                          export_animation_mode='ACTIONS', export_force_sampling=True, export_skins=True)
