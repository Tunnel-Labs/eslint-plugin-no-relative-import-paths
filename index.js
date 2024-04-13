// @ts-check

const path = require('path');
const pkgDir = require('pkg-dir');

function isParentFolder(relativeFilePath, context, rootDir) {
	const absoluteRootPath = path.join(context.getCwd(), rootDir);
	const absoluteFilePath = path.join(
		path.dirname(context.getFilename()),
		relativeFilePath,
	);

	return (
		relativeFilePath.startsWith('../') &&
		(rootDir === '' ||
			(absoluteFilePath.startsWith(absoluteRootPath) &&
				context.getFilename().startsWith(absoluteRootPath)))
	);
}

function isTsxFileInAppDirectory(relativeFilePath, context) {
	const absoluteFilePath = path.join(
		path.dirname(context.getFilename()),
		relativeFilePath,
	);

	return absoluteFilePath.endsWith('.tsx') &&
		absoluteFilePath.includes('/app/');
}

function isSameFolder(path) {
	return path.startsWith('./');
}

function getAbsolutePath(relativePath, context, rootDir, prefix) {
	const packageDirpath = pkgDir.sync(context.getFilename());
	return (
		prefix +
		path.relative(
			packageDirpath,
			path.join(path.dirname(context.getFilename()), relativePath),
		)
	);
}

const message = 'import statements should have an absolute path';

module.exports = {
	rules: {
		'no-relative-import-paths': {
			meta: {
				type: 'layout',
				fixable: 'code',
			},
			create: function(context) {
				const { allowSameFolder, rootDir, prefix } = {
					allowSameFolder: context.options[0]?.allowSameFolder || false,
					rootDir: context.options[0]?.rootDir || '',
					prefix: context.options[0]?.prefix || '#',
				};

				return {
					ImportDeclaration: function(node) {
						const relativeFilepath = node.source.value;

						if (relativeFilepath.includes('/node_modules/')) {
							return;
						}

						if (
							isParentFolder(relativeFilepath, context, rootDir) &&
							// We allow importing parent `.tsx` files from the Next.js `app/` directory
							!isTsxFileInAppDirectory(relativeFilepath, context)
						) {
							context.report({
								node,
								message: message,
								fix: function(fixer) {
									return fixer.replaceTextRange(
										[node.source.range[0] + 1, node.source.range[1] - 1],
										getAbsolutePath(relativeFilepath, context, rootDir, prefix),
									);
								},
							});
						}

						if (isSameFolder(relativeFilepath) && !allowSameFolder) {
							context.report({
								node,
								message: message,
								fix: function(fixer) {
									return fixer.replaceTextRange(
										[node.source.range[0] + 1, node.source.range[1] - 1],
										getAbsolutePath(relativeFilepath, context, rootDir, prefix),
									);
								},
							});
						}
					},
				};
			},
		},
	},
};
