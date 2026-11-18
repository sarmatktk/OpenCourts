export type GroupPreview={id:string;name:string;publicDescription:string;generalLocation:string;visibility:'public'|'private'};
export type GroupContent={description:string;skillPreference:string;version:number};
export type GroupDetail={group:GroupPreview;membership:{status:string;role:string|null}|null;content?:GroupContent;archived:boolean};
export type GroupFields={name:string;publicDescription:string;description:string;generalLocation:string;skillPreference:string;visibility:string};
export const emptyGroup:GroupFields={name:'',publicDescription:'',description:'',generalLocation:'',skillPreference:'any',visibility:'private'};
