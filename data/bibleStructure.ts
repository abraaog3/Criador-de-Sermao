export interface Pericope {
  reference: string;
  title: string;
}

export interface LiteraryUnit {
  title: string;
  pericopes: Pericope[];
}

export interface Book {
  name: string;
  literaryUnits: LiteraryUnit[];
}

const oldTestamentBooks: string[] = [
  'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio', 'Josué', 'Juízes', 'Rute',
  'I Samuel', 'II Samuel', 'I Reis', 'II Reis', 'I Crônicas', 'II Crônicas', 'Esdras',
  'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cantares', 'Isaías',
  'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel', 'Oseias', 'Joel', 'Amós', 'Obadias',
  'Jonas', 'Miqueias', 'Naum', 'Habacuque', 'Sofonias', 'Ageu', 'Zacarias', 'Malaquias'
];

const newTestamentBooks: string[] = [
  'Mateus', 'Marcos', 'Lucas', 'João', 'Atos', 'Romanos', 'I Coríntios', 'II Coríntios',
  'Gálatas', 'Efésios', 'Filipenses', 'Colossenses', 'I Tessalonicenses', 'II Tessalonicenses',
  'I Timóteo', 'II Timóteo', 'Tito', 'Filemom', 'Hebreus', 'Tiago', 'I Pedro', 'II Pedro',
  'I João', 'II João', 'III João', 'Judas', 'Apocalipse'
];

const allBookNames: string[] = [...oldTestamentBooks, ...newTestamentBooks];

export const bibleStructure: Book[] = allBookNames.map(name => ({
  name,
  literaryUnits: [],
}));
