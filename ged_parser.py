import chardet

class GEDParser:
    def __init__(self):
        self.individuals = {}
        self.families = {}
        self.current_entity = None
        self.connections = []

    def detect_encoding(self, file_path):
        with open(file_path, 'rb') as file:
            raw_data = file.read()
        return chardet.detect(raw_data)['encoding']

    def parse_file(self, file_path):
        print(f"Starting to parse file: {file_path}")
        encodings_to_try = ['utf-8', 'iso-8859-1', 'windows-1252']
        
        detected_encoding = self.detect_encoding(file_path)
        if detected_encoding:
            encodings_to_try.insert(0, detected_encoding)

        for encoding in encodings_to_try:
            try:
                with open(file_path, 'r', encoding=encoding) as file:
                    print(f"Attempting to parse with encoding: {encoding}")
                    for line_num, line in enumerate(file, 1):
                        self.process_line(line, line_num)
                print(f"Successfully parsed file with encoding: {encoding}")
                break
            except UnicodeDecodeError:
                print(f"Failed to parse with encoding: {encoding}")
                continue
            except Exception as e:
                print(f"An error occurred while parsing: {str(e)}")
                raise

        self.create_connections()
        print(f"Parsed {len(self.individuals)} individuals and {len(self.families)} families")
        return self.to_json_format()

    def process_line(self, line, line_num):
        parts = line.strip().split()
        if len(parts) < 2:
            print(f"Skipping invalid line {line_num}: {line.strip()}")
            return

        level = int(parts[0])
        if level == 0:
            if len(parts) > 2 and parts[2] in ['INDI', 'FAM']:
                self.process_level_0(parts[1], parts[2])
            else:
                self.current_entity = None
        elif level == 1:
            self.process_level_1(parts[1:])
        elif level == 2:
            self.process_level_2(parts[1:])

    def process_level_0(self, id, tag):
        if tag == 'INDI':
            self.current_entity = {'id': id.strip('@'), 'type': 'individual'}
            self.individuals[self.current_entity['id']] = self.current_entity
        elif tag == 'FAM':
            self.current_entity = {'id': id.strip('@'), 'type': 'family'}
            self.families[self.current_entity['id']] = self.current_entity

    def process_level_1(self, parts):
        if not self.current_entity:
            return
        
        tag = parts[0]
        value = ' '.join(parts[1:])
        
        if tag == 'NAME' and self.current_entity['type'] == 'individual':
            self.current_entity['name'] = value.strip('/')
        elif tag == 'SEX' and self.current_entity['type'] == 'individual':
            self.current_entity['sex'] = value
        elif tag in ['HUSB', 'WIFE'] and self.current_entity['type'] == 'family':
            self.current_entity.setdefault('spouses', []).append(value.strip('@'))
        elif tag == 'CHIL' and self.current_entity['type'] == 'family':
            self.current_entity.setdefault('children', []).append(value.strip('@'))
        elif tag in ['FAMS', 'FAMC'] and self.current_entity['type'] == 'individual':
            self.current_entity.setdefault(tag, []).append(value.strip('@'))
        elif tag == 'BIRT' and self.current_entity['type'] == 'individual':
            self.current_entity['birth_event'] = True

    def process_level_2(self, parts):
        if not self.current_entity or self.current_entity['type'] != 'individual':
            return

        tag = parts[0]
        value = ' '.join(parts[1:])

        if tag == 'DATE' and self.current_entity.get('birth_event'):
            birth_year = self.extract_year(value)
            if birth_year:
                self.current_entity['birthYear'] = birth_year
            self.current_entity['birth_event'] = False

    def extract_year(self, date_string):
        parts = date_string.split()
        for part in reversed(parts):
            if part.isdigit() and len(part) == 4:
                print(f"Extracted year: {part}")  # Add this debug line
                return int(part)
        print(f"Failed to extract year from: {date_string}")  # Add this debug line
        return None

    def create_connections(self):
        for family_id, family in self.families.items():
            for child_id in family.get('children', []):
                for spouse_id in family.get('spouses', []):
                    self.connections.append({
                        'from_node_id': spouse_id,
                        'to_node_id': child_id,
                        'type': 'Parent-Child'
                    })

            if len(family.get('spouses', [])) == 2:
                self.connections.append({
                    'from_node_id': family['spouses'][0],
                    'to_node_id': family['spouses'][1],
                    'type': 'Spouse'
                })

    def to_json_format(self):
        nodes = [
            {
                'id': individual_id,
                'name': individual.get('name', 'Unknown'),
                'type': 'Person',
                'sex': individual.get('sex', 'U'),
                'birthYear': individual.get('birthYear'),
            } for individual_id, individual in self.individuals.items()
        ]
        print(f"Generated {len(nodes)} nodes")  # Add this debug line
        print(f"Sample node: {nodes[0] if nodes else 'No nodes'}")  # Add this debug line
        return {'nodes': nodes, 'connections': self.connections}
