import os
import fnmatch

# =================CONFIGURATION =================
# The name of the file where all code will be saved
OUTPUT_FILENAME = 'codebase_context.txt'

# Folders and files to ignore (glob patterns)
# You can add extensions like '*.png' or specific filenames here.
IGNORE_PATTERNS = [
    # System / Version Control
    '.git', '.svn', '.hg', '.DS_Store', 'package-lock.json',
    
    # Dependencies
    'node_modules', 'venv', '.venv', 'env', '__pycache__',
    
    # Build / Output
    'dist', 'build', 'out', 'bin', 'obj', 'target', 'public', 'documentação', 'Terceirizado', 'staging_xml',
    
    # Media / Binary Assets (Optional but recommended)
    '*.png', '*.jpg', '*.jpeg', '*.gif', '*.ico', '*.svg',
    '*.exe', '*.dll', '*.so', '*.dylib', '*.pdf', '*.zip',
    '*.mp4', '*.mp3', '*.woff', '*.woff2', '*.ttf',

    
    # The script itself and the output file
    os.path.basename(__file__),
    OUTPUT_FILENAME
]
# ================================================

def is_ignored(path, names):
    """
    Returns a set of names that match the ignore patterns.
    Used to filter directories in-place and skip files.
    """
    ignored = set()
    for name in names:
        for pattern in IGNORE_PATTERNS:
            if fnmatch.fnmatch(name, pattern):
                ignored.add(name)
                break
    return ignored

def is_binary(file_path):
    """
    Simple check to see if a file is likely binary.
    Reads a chunk and checks for null bytes or decoding errors.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            f.read(1024)
            return False
    except (UnicodeDecodeError, Exception):
        return True

def main():
    root_dir = os.getcwd()
    output_path = os.path.join(root_dir, OUTPUT_FILENAME)
    
    print(f"🚀 Starting compilation in: {root_dir}")
    print(f"❌ Ignoring patterns: {IGNORE_PATTERNS}")
    
    with open(output_path, 'w', encoding='utf-8') as outfile:
        outfile.write(f"# CODEBASE CONTEXT\n# Generated from: {root_dir}\n\n")
        
        file_count = 0
        
        for root, dirs, files in os.walk(root_dir):
            # 1. Filter directories in-place so os.walk doesn't enter them
            ignored_dirs = is_ignored(root, dirs)
            dirs[:] = [d for d in dirs if d not in ignored_dirs]
            
            # 2. Filter files
            ignored_files = is_ignored(root, files)
            
            for file in files:
                if file in ignored_files:
                    continue
                
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, root_dir)
                
                # 3. Check if binary (skip images, etc to avoid errors)
                if is_binary(file_path):
                    print(f"⚠️  Skipping binary file: {relative_path}")
                    continue
                
                # 4. Write to output
                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                        # Formatting for the AI to understand file boundaries
                        outfile.write("=" * 50 + "\n")
                        outfile.write(f"FILE PATH: {relative_path}\n")
                        outfile.write("=" * 50 + "\n")
                        outfile.write(content + "\n\n")
                        
                        print(f"✅ Added: {relative_path}")
                        file_count += 1
                except Exception as e:
                    print(f"❌ Error reading {relative_path}: {e}")

    print(f"\n🎉 Done! {file_count} files compiled into '{OUTPUT_FILENAME}'")

if __name__ == "__main__":
    main()