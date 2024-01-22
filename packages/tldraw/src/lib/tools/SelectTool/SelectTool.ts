import { Editor, StateNode, TLShapeId, react } from '@tldraw/editor'
import { Brushing } from './childStates/Brushing'
import { Crop } from './childStates/Crop/Crop'
import { Cropping } from './childStates/Cropping'
import { DraggingHandle } from './childStates/DraggingHandle'
import { EditingShape } from './childStates/EditingShape'
import { Idle } from './childStates/Idle'
import { PointingCanvas } from './childStates/PointingCanvas'
import { PointingCropHandle } from './childStates/PointingCropHandle'
import { PointingHandle } from './childStates/PointingHandle'
import { PointingResizeHandle } from './childStates/PointingResizeHandle'
import { PointingRotateHandle } from './childStates/PointingRotateHandle'
import { PointingSelection } from './childStates/PointingSelection'
import { PointingShape } from './childStates/PointingShape'
import { Resizing } from './childStates/Resizing'
import { Rotating } from './childStates/Rotating'
import { ScribbleBrushing } from './childStates/ScribbleBrushing'
import { Translating } from './childStates/Translating'

/** @public */
export function isSelectTool(tool: StateNode | undefined): tool is SelectTool {
	return tool?.id === SelectTool.id
}

/** @public */
export class SelectTool extends StateNode {
	static override id = 'select' as const
	static override initial = 'idle'
	duplicateProps?: {
		shapeIds: TLShapeId[]
		offset: {
			x: number
			y: number
		}
	}

	constructor(editor: Editor, parent?: StateNode) {
		super(editor, parent)
		react('clean duplicate props', () => {
			this.cleanUpDuplicateProps()
		})
	}

	// We want to clean up the duplicate props when the selection changes
	cleanUpDuplicateProps = () => {
		const selectedShapeIds = this.editor.getSelectedShapeIds()
		if (!this.duplicateProps) return
		const duplicatedShapes = new Set(this.duplicateProps.shapeIds)
		if (
			selectedShapeIds.length === duplicatedShapes.size &&
			selectedShapeIds.every((shapeId) => duplicatedShapes.has(shapeId))
		) {
			return
		}
		this.duplicateProps = undefined
	}

	static override children = () => [
		Crop,
		Cropping,
		Idle,
		PointingCanvas,
		PointingShape,
		Translating,
		Brushing,
		ScribbleBrushing,
		PointingCropHandle,
		PointingSelection,
		PointingResizeHandle,
		EditingShape,
		Resizing,
		Rotating,
		PointingRotateHandle,
		PointingHandle,
		DraggingHandle,
	]

	override onExit = () => {
		if (this.editor.getCurrentPageState().editingShapeId) {
			this.editor.setEditingShape(null)
		}
	}
}
