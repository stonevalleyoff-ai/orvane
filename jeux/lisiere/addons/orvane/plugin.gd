@tool
extends EditorPlugin

# Activer l'extension (Projet › Paramètres du projet › Extensions) pose le singleton « Orvane » (orvane.gd).
func _enter_tree() -> void:
	add_autoload_singleton("Orvane", "res://addons/orvane/orvane.gd")


func _exit_tree() -> void:
	remove_autoload_singleton("Orvane")
