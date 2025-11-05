export const LANGUAGE_VERSIONS = {
    python: ["3.8", "3.9", "3.10", "3.11"],
    javascript: ["ES5", "ES6", "ES7", "ES8", "ES9", "ES10", "ES11", "ES12"],
    java: ["8", "11", "15", "17", "18"],
    cpp: ["11", "14", "17", "20"],
    c: ["99", "11", "17", "23"],
};

export const CODE_SNIPPETS = {
    javascript: '\nfunction helloWorld() {\n    console.log("Hello, World!");\n}\n\nhelloWorld();\n',
    python: '\ndef hello_world():\n    print("Hello, World!")\n\nhello_world()\n',
    java: '\npublic class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
    cpp: '\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n',
    c: '\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
};