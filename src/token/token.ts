import { TokenGenerator, TokenBase } from 'ts-token-generator';

const token = new TokenGenerator({ bitSize: 512, baseEncoding: TokenBase.BASE62 });


export default token;