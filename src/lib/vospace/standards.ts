/**
 * VOSpace capability standardIDs from OpenCADC
 * {@link https://github.com/opencadc/reg/blob/main/cadc-registry/src/main/java/ca/nrc/cadc/reg/Standards.java Standards}.
 *
 * Deprecated identifiers are omitted except `VOSPACE_FILES_20`, which some
 * registries still publish in place of `VOSPACE_FILES`.
 */

export const VOSPACE_NODES_20 = 'ivo://ivoa.net/std/VOSpace/v2.0#nodes';
export const VOSPACE_SYNC_21 = 'ivo://ivoa.net/std/VOSpace#sync-2.1';
export const VOSPACE_TRANSFERS_20 = 'ivo://ivoa.net/std/VOSpace/v2.0#transfers';
export const VOSPACE_FILES = 'ivo://ivoa.net/std/VOSpace#files-proto';
/** @deprecated Prefer {@link VOSPACE_FILES}. Kept as a registry fallback. */
export const VOSPACE_FILES_20 = 'ivo://ivoa.net/std/VOSpace/v2.x#files';

/** XML namespace written by the current OpenCADC `NodeWriter` (VOSpace 2.x). */
export const VOSPACE_XML_NS = 'http://www.ivoa.net/xml/VOSpace/v2.0';
export const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';

const CORE = 'ivo://ivoa.net/vospace/core#';

export const PROPERTY_LENGTH = `${CORE}length`;
export const PROPERTY_DATE = `${CORE}date`;
export const PROPERTY_CREATOR = `${CORE}creator`;
export const PROPERTY_QUOTA = `${CORE}quota`;
export const PROPERTY_GROUP_READ = `${CORE}groupread`;
export const PROPERTY_GROUP_WRITE = `${CORE}groupwrite`;
export const PROPERTY_IS_PUBLIC = `${CORE}ispublic`;
export const PROPERTY_IS_LOCKED = 'ivo://cadc.nrc.ca/vospace/core#islocked';
export const PROPERTY_INHERIT_PERMISSIONS = 'ivo://cadc.nrc.ca/vospace/core#inheritPermissions';

/** OpenCADC separates group URIs in groupread / groupwrite with a space. */
export const GROUP_PROPERTY_DELIMITER = ' ';
