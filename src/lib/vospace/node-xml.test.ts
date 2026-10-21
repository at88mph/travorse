import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROPERTY_IS_PUBLIC, PROPERTY_LENGTH } from './standards';
import { parseNodeXml, writeNodeXml } from './node-xml';
import type { VospaceNode } from './node';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<node xmlns="http://www.ivoa.net/xml/VOSpace/v2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" uri="vos://cadc.nrc.ca~arc/home" xsi:type="vos:ContainerNode">
  <properties>
    <property uri="ivo://ivoa.net/vospace/core#ispublic">false</property>
    <property uri="ivo://ivoa.net/vospace/core#groupread" readOnly="true">ivo://cadc.nrc.ca/gms?A ivo://cadc.nrc.ca/gms?B</property>
    <property uri="ivo://cadc.nrc.ca/vospace/core#islocked" xsi:nil="true"/>
  </properties>
  <nodes>
    <node uri="vos://cadc.nrc.ca~arc/home/data.txt" xsi:type="vos:DataNode" busy="false">
      <properties>
        <property uri="ivo://ivoa.net/vospace/core#length">42</property>
      </properties>
      <accepts>
        <view uri="ivo://ivoa.net/vospace/core#anyview"/>
      </accepts>
      <provides>
        <view uri="ivo://ivoa.net/vospace/core#defaultview"/>
      </provides>
    </node>
    <node uri="vos://cadc.nrc.ca~arc/home/link" xsi:type="vos:LinkNode">
      <properties/>
      <target>vos://cadc.nrc.ca~arc/elsewhere</target>
    </node>
  </nodes>
</node>`;

describe('node xml', () => {
  it('reads a container, a data node, and a link', () => {
    const node = parseNodeXml(SAMPLE);
    assert.equal(node.type, 'ContainerNode');
    assert.equal(node.uri, 'vos://cadc.nrc.ca~arc/home');
    assert.equal(node.properties[0]?.uri, PROPERTY_IS_PUBLIC);
    assert.equal(node.properties[0]?.value, 'false');
    assert.equal(node.properties[1]?.readOnly, true);
    assert.equal(node.properties[2]?.value, null);
    assert.equal(node.children?.length, 2);

    const file = node.children?.[0];
    assert.equal(file?.type, 'DataNode');
    assert.equal(file?.busy, false);
    assert.equal(file?.properties[0]?.uri, PROPERTY_LENGTH);
    assert.equal(file?.properties[0]?.value, '42');
    assert.deepEqual(file?.accepts, ['ivo://ivoa.net/vospace/core#anyview']);
    assert.deepEqual(file?.provides, ['ivo://ivoa.net/vospace/core#defaultview']);

    const link = node.children?.[1];
    assert.equal(link?.type, 'LinkNode');
    assert.equal(link?.target, 'vos://cadc.nrc.ca~arc/elsewhere');
  });

  it('round-trips a written document', () => {
    const original: VospaceNode = {
      type: 'ContainerNode',
      uri: 'vos://cadc.nrc.ca~arc/home',
      properties: [{ uri: PROPERTY_IS_PUBLIC, value: 'false' }],
      children: [
        {
          type: 'DataNode',
          uri: 'vos://cadc.nrc.ca~arc/home/a&b.txt',
          properties: [{ uri: PROPERTY_LENGTH, value: '1' }],
          busy: true,
          accepts: [],
          provides: ['ivo://ivoa.net/vospace/core#defaultview'],
        },
      ],
    };
    const again = parseNodeXml(writeNodeXml(original));
    assert.equal(again.type, 'ContainerNode');
    assert.equal(again.uri, original.uri);
    assert.equal(again.properties[0]?.value, 'false');
    assert.equal(again.children?.[0]?.uri, 'vos://cadc.nrc.ca~arc/home/a&b.txt');
    assert.equal(again.children?.[0]?.busy, true);
    assert.deepEqual(again.children?.[0]?.provides, ['ivo://ivoa.net/vospace/core#defaultview']);
  });
});
