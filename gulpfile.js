const gulp = require('gulp');
const replace = require('gulp-replace');

gulp.task('update-paths', function () {
    return gulp.src('public/index.html')
        .pipe(replace(/href="styles/g, 'href="public/styles'))
        .pipe(replace(/src="scripts/g, 'src="public/scripts'))
        .pipe(replace(/src="icons/g, 'src="public/icons'))
        .pipe(gulp.dest('.')); // Zapisz w głównym katalogu
});

gulp.task('default', gulp.series('update-paths'));