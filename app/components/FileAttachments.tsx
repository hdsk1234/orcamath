'use client';
import type {ComponentProps} from 'react';
import {FILE_ATTACHMENTS_ENABLED,FILE_ATTACHMENTS_MESSAGE} from '../lib/file-storage';

export function FileInput(props:ComponentProps<'input'>){
 return <><input {...props} disabled={!FILE_ATTACHMENTS_ENABLED||props.disabled}/>{!FILE_ATTACHMENTS_ENABLED&&<small role="status">{FILE_ATTACHMENTS_MESSAGE}</small>}</>;
}

export function AttachmentLink({href,children,...props}:ComponentProps<'a'>){
 const storedFile=href?.startsWith('/api/file?')||href?.startsWith('/api/diagnostic-ai/source?');
 if(!FILE_ATTACHMENTS_ENABLED&&storedFile){
  return <span className={props.className} aria-disabled="true" title={FILE_ATTACHMENTS_MESSAGE}>{FILE_ATTACHMENTS_MESSAGE}</span>;
 }
 return <a {...props} href={href}>{children}</a>;
}
