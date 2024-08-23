import * as path from 'path';
import * as fs from 'fs';

const possibleDirs = [
    path.resolve(__dirname, '../../'),
    path.resolve(__dirname, '../../dist'),
    path.resolve(__dirname, '../../dist/src/config'),
    path.resolve(__dirname, '../../dist/src/controllers'),
    path.resolve(__dirname, '../../dist/src/helper'),
    path.resolve(__dirname, '../../dist/src/lib'),
    path.resolve(__dirname, '../../dist/src/models'),
    path.resolve(__dirname, '../../dist/src/routes'),
    path.resolve(__dirname, '../config'),
    path.resolve(__dirname, '../controllers'),
    path.resolve(__dirname, '../helper'),
    path.resolve(__dirname, '../lib'),
    path.resolve(__dirname, '../models'),
    path.resolve(__dirname, '../routes'),
  ];
  
  let filePath: string | null = null;
  
  for (const dir of possibleDirs) {
    const possiblePath = path.join(dir, 'operators.json');
    if (fs.existsSync(possiblePath)) {
      filePath = possiblePath;
      break;
    }
  }
  
  if (!filePath) {
    console.error('Unable to find the list_operator.json file in the specified directories');
    process.exit(1);
  }
  
const rawData = fs.readFileSync(filePath, 'utf-8');
const dataJson = JSON.parse(rawData);

export interface Operator {
  address: string;
  privateKey:string
}

export const listOperators:Operator[] = dataJson.listOperator