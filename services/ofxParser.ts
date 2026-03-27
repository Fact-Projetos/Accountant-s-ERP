export interface OfxTransaction {
  id: string;
  date: Date;
  amount: number;
  name: string;
  memo: string;
}

export const parseOfx = (ofxString: string): OfxTransaction[] => {
  const transactions: OfxTransaction[] = [];
  
  // Regex to find all STMTTRN blocks
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;
  
  while ((match = stmttrnRegex.exec(ofxString)) !== null) {
    const block = match[1];
    
    const id = getTagValue(block, 'FITID');
    const dateStr = getTagValue(block, 'DTPOSTED');
    const amountStr = getTagValue(block, 'TRNAMT');
    const name = getTagValue(block, 'NAME');
    const memo = getTagValue(block, 'MEMO');
    
    if (id && dateStr && amountStr) {
      transactions.push({
        id,
        date: parseOfxDate(dateStr),
        amount: parseFloat(amountStr.replace(',', '.')),
        name: name || '',
        memo: memo || ''
      });
    }
  }
  
  return transactions;
};

const getTagValue = (block: string, tag: string): string | null => {
  const regex = new RegExp(`<${tag}>([^<\\n]*)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : null;
};

const parseOfxDate = (ofxDate: string): Date => {
  // OFX date format: YYYYMMDDHHMMSS
  const year = parseInt(ofxDate.substring(0, 4));
  const month = parseInt(ofxDate.substring(4, 6)) - 1;
  const day = parseInt(ofxDate.substring(6, 8));
  
  const hour = parseInt(ofxDate.substring(8, 10)) || 0;
  const minute = parseInt(ofxDate.substring(10, 12)) || 0;
  const second = parseInt(ofxDate.substring(12, 14)) || 0;
  
  return new Date(year, month, day, hour, minute, second);
};
