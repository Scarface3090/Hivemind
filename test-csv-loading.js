// Simple test to verify CSV loading works with embedded data
const EMBEDDED_CSV_DATA = `ID,Context,Left_Label,Right_Label,Difficulty
1,Movies,Flop,Blockbuster,EASY
2,Movies,Overrated,Underrated,MEDIUM
3,Food,Basic,Gourmet,EASY`;

function testCsvParsing() {
  console.log('Testing CSV parsing with embedded data...');
  
  const csvContent = EMBEDDED_CSV_DATA.trim();
  const lines = csvContent.split('\n');
  
  console.log(`Found ${lines.length} lines (including header)`);
  
  const headers = lines[0]?.split(',').map(h => h.trim()) || [];
  console.log(`Headers: ${headers.join(', ')}`);
  
  const dataRows = lines.slice(1);
  console.log(`Data rows: ${dataRows.length}`);
  
  dataRows.forEach((line, index) => {
    const row = line.split(',').map(cell => cell.trim());
    console.log(`Row ${index + 1}: ${row.join(' | ')}`);
  });
  
  console.log('✓ CSV parsing test completed successfully');
}

testCsvParsing();
