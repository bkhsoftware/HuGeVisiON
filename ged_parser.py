import chardet

class GEDParser:
    def __init__(self):
        self.individuals = {}
        self.families = {}
        self.current_entity = None

    def detect_encoding(self, file_path):
        with open(file_path, 'rb') as file:
            raw_data = file.read()
        return chardet.detect(raw_data)['encoding']

    def parse_file(self, file_path):
        print(f"Starting to parse file: {file_path}")
        encodings_to_try = ['utf-8', 'iso-8859-1', 'windows-1252']
        
        # Try to detect the encoding
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

        print(f"Parsed {len(self.individuals)} individuals and {len(self.families)} families")
        return self.to_json_format()

    def process_line(self, line, line_num):
        print(f"Processing line {line_num}: {line.strip()}")  # Debug print
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
            print(f"Created individual: {self.current_entity['id']}")  # Debug print
        elif tag == 'FAM':
            self.current_entity = {'id': id.strip('@'), 'type': 'family'}
            self.families[self.current_entity['id']] = self.current_entity
            print(f"Created family: {self.current_entity['id']}")  # Debug print

    def process_level_1(self, parts):
        if not self.current_entity:
            return
        
        tag = parts[0]
        value = ' '.join(parts[1:])
        
        if tag == 'NAME' and self.current_entity['type'] == 'individual':
            self.current_entity['name'] = value.strip('/')
            print(f"Added name to individual {self.current_entity['id']}: {value}")  # Debug print
        elif tag == 'SEX' and self.current_entity['type'] == 'individual':
            self.current_entity['sex'] = value
            print(f"Added sex to individual {self.current_entity['id']}: {value}")  # Debug print
        elif tag in ['HUSB', 'WIFE'] and self.current_entity['type'] == 'family':
            self.current_entity.setdefault('spouses', []).append(value.strip('@'))
            print(f"Added spouse to family {self.current_entity['id']}: {value.strip('@')}")  # Debug print
        elif tag == 'CHIL' and self.current_entity['type'] == 'family':
            self.current_entity.setdefault('children', []).append(value.strip('@'))
            print(f"Added child to family {self.current_entity['id']}: {value.strip('@')}")  # Debug print
        elif tag == 'FAMS' and self.current_entity['type'] == 'individual':
            self.current_entity.setdefault('families', []).append(value.strip('@'))
            print(f"Added family to individual {self.current_entity['id']}: {value.strip('@')}")  # Debug print

    def process_level_2(self, parts):
        # Add processing for level 2 tags if needed
        pass

    def to_json_format(self):
        nodes = []
        connections = []

        for individual_id, individual in self.individuals.items():
            nodes.append({
                'id': individual_id,
                'name': individual.get('name', 'Unknown'),
                'type': 'Person',
                'sex': individual.get('sex', 'U'),
            })

        for family_id, family in self.families.items():
            for child_id in family.get('children', []):
                for spouse_id in family.get('spouses', []):
                    connections.append({
                        'from_node_id': spouse_id,
                        'to_node_id': child_id,
                        'type': 'Parent-Child'
                    })

            if len(family.get('spouses', [])) == 2:
                connections.append({
                    'from_node_id': family['spouses'][0],
                    'to_node_id': family['spouses'][1],
                    'type': 'Spouse'
                })

        return {'nodes': nodes, 'connections': connections}