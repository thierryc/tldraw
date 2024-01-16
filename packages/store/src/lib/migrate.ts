import { UnknownRecord } from './BaseRecord'
import { StoreSnapshot } from './Store'
import { SerializedSchema } from './StoreSchema'

/**
 * A migration ID is a string that uniquely identifies a migration.
 * It should include a namespace followed by a slash and then a unique identifier within than namespace.
 * e.g. `com.tldraw/023_add_arrow_label_position`
 * By convention we use an incrementing integer and a semantic description of the migration as the unique name part, but
 * this is not enforced.
 */
export type MigrationId = `${string}/${string}`
export type Migration = StoreMigration | RecordMigration | LegacyMigration

/**
 * Secret migration type for legacy migrations
 */
export interface LegacyMigration extends BaseMigration {
	scope: '__legacy__'
	// eslint-disable-next-line deprecation/deprecation
	up(
		legacySerializedSchema: SerializedSchema,
		store: StoreSnapshot<UnknownRecord>
	): StoreSnapshot<UnknownRecord>
	// no down migrations for store-level migrations
}

interface BaseMigration {
	id: MigrationId
	// if this migration needs to run after another migration from a different sequence, specify it here
	dependsOn: MigrationId[]
}

/**
 * Store migrations operate on the entire store at once.
 * It does not support 'down' migrations because that would be prohibitively expensive
 * (and probably not even very useful) for the main use case i.e. allowing sync
 * server backwards compatibility
 */
export interface StoreMigration extends BaseMigration {
	scope: 'store'
	up(store: StoreSnapshot<UnknownRecord>): StoreSnapshot<UnknownRecord>
}

/**
 * Record migrations operate on a single record at a time
 * They cannot create or delete records.
 * They are not scoped to a particular type or subtype, but are rather run for every record in the store.
 * It's up to them to check the record type/subtype and decide whether to do anything.
 */
export interface RecordMigration extends BaseMigration{
	scope: 'record'
	up(record: UnknownRecord): UnknownRecord
	down: null | ((record: UnknownRecord) => UnknownRecord)
}

// tldraw extensions that need to do migrations would provide a 'MigrationSequences' object
type MigrationSequence = {
	// the sequence ID uniquely identifies a sequence of migrations. it should
	// be human readable and ideally namespaced e.g. `com.tldraw/TLArrowShape`
	id: string
	migrations: Migration[]
}

export function defineMigrationSequence(id: string, migrations: Migration[]): MigrationSequence {
	return { id, migrations }
}

export function validateMigrationSequences(migrationSequences: Migration[]) {}

export type MigrationRecord = {
	version: 0
	appliedMigrations: MigrationId[]
}

export type { Migration, MigrationId, MigrationSequence }
