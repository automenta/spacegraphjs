package com.example.spacegraphkt.core

import com.example.spacegraphkt.data.NodeData
import com.example.spacegraphkt.data.Size
import com.example.spacegraphkt.data.Vector3D
import com.example.spacegraphkt.external.generateId // Ensure this is accessible
import kotlinx.dom.addClass // For KDoc example if needed, though addClass is internal to HtmlNodeElement

/**
 * A specialized [HtmlNodeElement] pre-configured for creating editable text notes.
 * It sets default properties in its [NodeData] to be suitable for notes,
 * such as `type = "note"` and `editable = true`.
 * The label of the node is often initialized from its content if a label is not explicitly provided.
 *
 * @param id Unique identifier for the note node. Auto-generated if blank.
 * @param position Initial 3D position of the note node.
 * @param data Data object ([NodeData]) for the note. Key fields used:
 *             `data.content` (for the note's text), `data.label` (optional, defaults from content),
 *             `data.width`, `data.height` (for initial size).
 *             The constructor ensures `data.type` is "note" and `data.editable` is true.
 */
actual class NoteNode actual constructor(
    actual override var id: String,
    actual override var position: Vector3D,
    actual override var data: NodeData
) : HtmlNodeElement(
    // Ensure ID is generated if initially blank
    id = if (id.isBlank()) generateId("note-kt-") else id,
    position = position,
    // Configure NodeData specifically for a NoteNode
    data = data.apply {
        this.type = "note" // Set or confirm type
        this.editable = true // Notes are typically editable by default
        // If label is not set but content is, use content as label
        if (this.label.isNullOrBlank() && !this.content.isNullOrBlank()) {
            this.label = this.content // Or a snippet of the content
        }
        // Default visual properties for notes can also be set here if not in CSS
        // e.g., this.backgroundColor = this.backgroundColor ?: "rgba(255, 255, 220, 0.85)"
    },
    // Use size from NodeData if provided, otherwise default for notes
    size = Size(data.width ?: 160.0, data.height ?: 70.0),
    // Billboard behavior from NodeData or default to true for notes
    billboard = data.billboard ?: true
) {
    init {
        // Ensure the specific CSS class for note-node styling is present on the HTML element.
        // This class is typically defined in an external CSS file (e.g., style.css).
        // The base HtmlNodeElement constructor already adds "type-note" and "note-node" classes.
        // This is more of a confirmation or could be used for additional specific styling.
        htmlElement.addClass("note-node-specific") // Example if further distinction is needed
    }

    // NoteNode specific functionalities can be added here if any.
    // For example, methods to handle checklists if notes support them, or specific formatting.
    // Most behavior is inherited from HtmlNodeElement.
}
