export {
  NodeAlreadyExistsError,
  NodeNotFoundError,
  NodeNotSupportedError,
  NodeParsingError,
  NotAuthenticatedError,
  PermissionDeniedError,
  ServiceNotFoundError,
  VospaceError,
} from './errors';
export {
  containerNode,
  dataNode,
  linkNode,
  propertyValue,
  type VospaceNode,
  type VospaceNodeType,
  type VospaceProperty,
} from './node';
export { parseNodeXml, writeNodeXml } from './node-xml';
export {
  GROUP_PROPERTY_DELIMITER,
  PROPERTY_CREATOR,
  PROPERTY_DATE,
  PROPERTY_GROUP_READ,
  PROPERTY_GROUP_WRITE,
  PROPERTY_INHERIT_PERMISSIONS,
  PROPERTY_IS_LOCKED,
  PROPERTY_IS_PUBLIC,
  PROPERTY_LENGTH,
  PROPERTY_QUOTA,
  VOSPACE_FILES,
  VOSPACE_FILES_20,
  VOSPACE_NODES_20,
  VOSPACE_SYNC_21,
  VOSPACE_TRANSFERS_20,
  VOSPACE_XML_NS,
} from './standards';
export { createVospaceClient, getVospaceUri } from './vospace-config';
export {
  VOSpaceClient,
  buildServiceEndpoint,
  type ServiceDirectory,
  type VOSpaceClientOptions,
} from './vospace-client';
export { normalizeNodePath, parseVospacePrefix, VosUri } from './vos-uri';
