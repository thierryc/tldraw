/* eslint-disable deprecation/deprecation */
import { Result, getOwnProperty, objectMapValues } from '@tldraw/utils'
import { IdOf, UnknownRecord } from './BaseRecord'
import { RecordType } from './RecordType'
import { SerializedStore, Store, StoreSnapshot } from './Store'
import {
	MigrationFailureReason,
	MigrationResult,
	Migrations,
	migrate,
	migrateRecord,
} from './legacy_migrate'
import { MigrationId, MigrationSequence } from './migrate'

const LEGACY_SCHEMA_VERSION = 1
const CURRENT_SCHEMA_VERSION = 2

/** @deprecated - Use MigrationRecord */
export type SerializedSchema =
	| {
			/** Schema version is the version for this type you're looking at right now */
			schemaVersion: typeof CURRENT_SCHEMA_VERSION
			versionHistory: MigrationId[]
	  }
	| {
			/** Schema version is the version for this type you're looking at right now */
			schemaVersion: typeof LEGACY_SCHEMA_VERSION
			/**
			 * Store version is the version for the structure of the store. e.g. higher level structure like
			 * removing or renaming a record type.
			 */
			storeVersion: number
			/** Record versions are the versions for each record type. e.g. adding a new field to a record */
			recordVersions: Record<
				string,
				| {
						version: number
				  }
				| {
						// subtypes are used for migrating shape and asset props
						version: number
						subTypeVersions: Record<string, number>
						subTypeKey: string
				  }
			>
	  }

/** @public */
export type StoreSchemaOptions<R extends UnknownRecord, P> = {
	/**
	 * @public
	 * Any migrations for the store's data.
	 */
	migrations?: MigrationSequence[]
	/** @deprecated - Use `migrations` instead. */
	snapshotMigrations?: Migrations
	/** @public */
	onValidationFailure?: (data: {
		error: unknown
		store: Store<R>
		record: R
		phase: 'initialize' | 'createRecord' | 'updateRecord' | 'tests'
		recordBefore: R | null
	}) => R
	/** @internal */
	createIntegrityChecker?: (store: Store<R, P>) => void
}

/** @public */
export class StoreSchema<R extends UnknownRecord, P = unknown> {
	static create<R extends UnknownRecord, P = unknown>(
		// HACK: making this param work with RecordType is an enormous pain
		// let's just settle for making sure each typeName has a corresponding RecordType
		// and accept that this function won't be able to infer the record type from it's arguments
		types: { [TypeName in R['typeName']]: { createId: any } },
		options?: StoreSchemaOptions<R, P>
	): StoreSchema<R, P> {
		return new StoreSchema<R, P>(types as any, options ?? {})
	}

	private readonly sortedMigrationIds: MigrationId[]
	private readonly migrations: Map<string, >

	private constructor(
		public readonly types: {
			[Record in R as Record['typeName']]: RecordType<R, any>
		},
		private readonly options: StoreSchemaOptions<R, P>
	) {}

	// eslint-disable-next-line no-restricted-syntax
	get currentStoreVersion(): number {
		return this.options.snapshotMigrations?.currentVersion ?? 0
	}

	validateRecord(
		store: Store<R>,
		record: R,
		phase: 'initialize' | 'createRecord' | 'updateRecord' | 'tests',
		recordBefore: R | null
	): R {
		try {
			const recordType = getOwnProperty(this.types, record.typeName)
			if (!recordType) {
				throw new Error(`Missing definition for record type ${record.typeName}`)
			}
			return recordType.validate(record)
		} catch (error: unknown) {
			if (this.options.onValidationFailure) {
				return this.options.onValidationFailure({
					store,
					record,
					phase,
					recordBefore,
					error,
				})
			} else {
				throw error
			}
		}
	}

	private getMigrationsSince(
		schema: SerializedSchema,
	): MigrationSequence | undefined {
		if (schema.schemaVersion === LEGACY_SCHEMA_VERSION) {
			return this.sortedMigrations

		}

	}

	migratePersistedRecord(
		record: R,
		persistedSchema: SerializedSchema,
		direction: 'up' | 'down' = 'up'
	): MigrationResult<R> & Result<R, string> {
		if (persistedSchema.schemaVersion === LEGACY_SCHEMA_VERSION) {

		}

		return { type: 'success', value: result.value, ok: true }
	}

	migrateStoreSnapshot(snapshot: StoreSnapshot<R>): MigrationResult<SerializedStore<R>> {
	}

	/** @internal */
	createIntegrityChecker(store: Store<R, P>): (() => void) | undefined {
		return this.options.createIntegrityChecker?.(store) ?? undefined
	}

	serialize(): SerializedSchema {
		return {
			schemaVersion: 1,
			storeVersion: this.options.snapshotMigrations?.currentVersion ?? 0,
			recordVersions: Object.fromEntries(
				objectMapValues(this.types).map((type) => [
					type.typeName,
					type.migrations.subTypeKey && type.migrations.subTypeMigrations
						? {
								version: type.migrations.currentVersion,
								subTypeKey: type.migrations.subTypeKey,
								subTypeVersions: type.migrations.subTypeMigrations
									? Object.fromEntries(
											Object.entries(type.migrations.subTypeMigrations).map(([k, v]) => [
												k,
												v.currentVersion,
											])
										)
									: undefined,
							}
						: {
								version: type.migrations.currentVersion,
							},
				])
			),
		}
	}

	serializeEarliestVersion(): SerializedSchema {
		return {
			schemaVersion: 1,
			storeVersion: this.options.snapshotMigrations?.firstVersion ?? 0,
			recordVersions: Object.fromEntries(
				objectMapValues(this.types).map((type) => [
					type.typeName,
					type.migrations.subTypeKey && type.migrations.subTypeMigrations
						? {
								version: type.migrations.firstVersion,
								subTypeKey: type.migrations.subTypeKey,
								subTypeVersions: type.migrations.subTypeMigrations
									? Object.fromEntries(
											Object.entries(type.migrations.subTypeMigrations).map(([k, v]) => [
												k,
												v.firstVersion,
											])
										)
									: undefined,
							}
						: {
								version: type.migrations.firstVersion,
							},
				])
			),
		}
	}
}
